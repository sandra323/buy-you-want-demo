import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode, type AuthTokensData } from '@lightbuy/shared';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { USER_STATUS_BANNED, User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AppException } from '../http/app.exception';
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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
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

  /** 签发 access JWT + 明文 refresh；库里只存 sha256，明文只回给客户端一次。 */
  private async issueTokens(user: User): Promise<AuthTokensData> {
    const accessToken = await this.jwtService.signAsync({ sub: user.id });
    const refreshToken = generateRawRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + getJwtRefreshTtlMs());

    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        revoked: false,
        revokedAt: null,
        replacedBy: null,
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: toPublicUser(user),
    };
  }
}
