import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { getJwtAccessTtl, getJwtSecret } from './jwt-env';
import { JwtStrategy } from './jwt.strategy';
import { RefreshToken } from './refresh-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtSecret(),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: getJwtAccessTtl(),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
