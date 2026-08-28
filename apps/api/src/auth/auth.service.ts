import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode, type AuthTokensData } from '@lightbuy/shared';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { USER_STATUS_BANNED, User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AppException } from '../http/app.exception';
import { AuthClock } from './auth.clock';
import { defaultNickname, toPublicUser } from './public-user';
import { getJwtRefreshTtlMs } from './jwt-env';
import {
  generateRawRefreshToken,
  hashRefreshToken,
} from './refresh-token.util';
import { RefreshToken } from './refresh-token.entity';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

/** bcrypt 成本因子；测试与签发共用，避免断言和实现各写一套。 */
export const BCRYPT_COST = 10;

/** 已吊销 refresh 在此窗口内再提交视为网络重试，不全量吊销。 */
export const REFRESH_REUSE_GRACE_MS = 60_000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly clock: AuthClock,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensData> {
    const existing = await this.usersService.findByPhone(dto.phone);
    if (existing) {
      // 已注册手机号：409 + 40202，和唯一索引撞车走同一业务码。
      throw new AppException(ErrorCode.PHONE_TAKEN);
    }

    const passwordHash = await hash(dto.password, BCRYPT_COST);
    const user = await this.usersService.create({
      phone: dto.phone,
      passwordHash,
      nickname: defaultNickname(dto.phone),
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokensData> {
    const user = await this.usersService.findByPhone(dto.phone);
    // 不存在 / 封禁 / 密码错一律 40201「手机号或密码错误」，避免枚举账号。
    if (!user || user.status === USER_STATUS_BANNED) {
      throw new AppException(ErrorCode.AUTH_CREDENTIALS);
    }

    const passwordOk = await compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      throw new AppException(ErrorCode.AUTH_CREDENTIALS);
    }

    return this.issueTokens(user);
  }

  /**
   * build-spec §5 步骤 1–6：哈希查找 → 吊销复用检测 → 过期 → 封禁 → 旋转。
   */
  async refresh(rawToken: string): Promise<AuthTokensData> {
    const now = this.clock.now();
    const tokenHash = hashRefreshToken(rawToken);
    const current = await this.refreshTokens.findOne({ where: { tokenHash } });

    if (!current) {
      throw new AppException(ErrorCode.REFRESH_EXPIRED);
    }

    if (current.revoked) {
      const revokedAt = current.revokedAt;
      const withinGrace =
        revokedAt != null &&
        now.getTime() - revokedAt.getTime() <= REFRESH_REUSE_GRACE_MS;
      if (!withinGrace) {
        await this.revokeAllForUser(current.userId, now);
      }
      throw new AppException(ErrorCode.REFRESH_REVOKED);
    }

    if (current.expiresAt.getTime() < now.getTime()) {
      throw new AppException(ErrorCode.REFRESH_EXPIRED);
    }

    const user = await this.usersService.findById(current.userId);
    if (!user || user.status === USER_STATUS_BANNED) {
      throw new AppException(ErrorCode.AUTH_CREDENTIALS);
    }

    return this.rotate(current, user, now);
  }

  /** 吊销该用户全部未作废 refresh；后续 refresh 失败。 */
  async logout(userId: string): Promise<{ ok: true }> {
    await this.revokeAllForUser(userId, this.clock.now());
    return { ok: true };
  }

  /** 签发 access JWT + 明文 refresh；库里只存 sha256，明文只回给客户端一次。 */
  private async issueTokens(user: User): Promise<AuthTokensData> {
    const accessToken = await this.jwtService.signAsync({ sub: user.id });
    const { raw } = await this.insertRefreshRow(user.id, this.clock.now());
    return {
      accessToken,
      refreshToken: raw,
      user: toPublicUser(user),
    };
  }

  private async rotate(
    current: RefreshToken,
    user: User,
    now: Date,
  ): Promise<AuthTokensData> {
    const accessToken = await this.jwtService.signAsync({ sub: user.id });
    const { raw, row } = await this.insertRefreshRow(user.id, now);

    current.revoked = true;
    current.revokedAt = now;
    current.replacedBy = row.id;
    await this.refreshTokens.save(current);

    return {
      accessToken,
      refreshToken: raw,
      user: toPublicUser(user),
    };
  }

  private async insertRefreshRow(
    userId: string,
    now: Date,
  ): Promise<{ raw: string; row: RefreshToken }> {
    const raw = generateRawRefreshToken();
    const row = await this.refreshTokens.save(
      this.refreshTokens.create({
        userId,
        tokenHash: hashRefreshToken(raw),
        expiresAt: new Date(now.getTime() + getJwtRefreshTtlMs()),
        revoked: false,
        revokedAt: null,
        replacedBy: null,
      }),
    );
    return { raw, row };
  }

  private async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.refreshTokens.update(
      { userId, revoked: false },
      { revoked: true, revokedAt: now },
    );
  }
}
