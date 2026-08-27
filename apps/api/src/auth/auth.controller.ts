import { Controller, Get, Post, Req } from '@nestjs/common';
import type { AccessUser } from './jwt.strategy';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  @Public()
  @Post('register')
  register() {
    return {};
  }

  @Public()
  @Post('login')
  login() {
    return {};
  }

  @Public()
  @Post('refresh')
  refresh() {
    return {};
  }

  /** Protected probe so JWT guard AC can be tested before register/login. */
  @Get('session')
  session(@Req() req: { user: AccessUser }) {
    return { userId: req.user.id };
  }
}
