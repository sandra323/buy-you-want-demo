import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@lightbuy/shared';
import { Repository } from 'typeorm';
import { toPublicUser } from '../auth/public-user';
import { isMysqlDuplicateError } from '../database/is-mysql-duplicate';
import { AppException } from '../http/app.exception';
import { USER_STATUS_ACTIVE, USER_STATUS_BANNED, User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findByPhone(phone: string): Promise<User | null> {
    return this.users.findOne({ where: { phone } });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  /** 从数据库组公开资料，不信任 JWT 里的 nickname/phone。 */
  async getMe(userId: string) {
    const user = await this.findById(userId);
    if (!user || user.status === USER_STATUS_BANNED) {
      throw new AppException(ErrorCode.UNAUTHORIZED_MISSING);
    }
    return toPublicUser(user);
  }

  async create(input: {
    phone: string;
    passwordHash: string;
    nickname: string;
  }): Promise<User> {
    const user = this.users.create({
      phone: input.phone,
      passwordHash: input.passwordHash,
      nickname: input.nickname,
      avatar: null,
      status: USER_STATUS_ACTIVE,
    });
    try {
      return await this.users.save(user);
    } catch (error) {
      // findByPhone 过了仍可能撞唯一索引，和「手机号已注册」同一套错误。
      if (isMysqlDuplicateError(error)) {
        throw new AppException(ErrorCode.PHONE_TAKEN);
      }
      throw error;
    }
  }
}
