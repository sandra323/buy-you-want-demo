import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@lightbuy/shared';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AppException } from '../http/app.exception';
import { USER_STATUS_BANNED, User } from '../users/user.entity';
import { getJwtSecret } from './jwt-env';

export type AccessJwtPayload = {
  sub: string;
};

export type AccessUser = {
  id: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: AccessJwtPayload): Promise<AccessUser> {
    const userId = payload?.sub;
    if (!userId || typeof userId !== 'string') {
      throw new AppException(ErrorCode.UNAUTHORIZED_INVALID);
    }

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.status === USER_STATUS_BANNED) {
      throw new AppException(ErrorCode.UNAUTHORIZED_MISSING);
    }

    return { id: user.id };
  }
}
