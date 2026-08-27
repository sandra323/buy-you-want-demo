import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import type { AccessUser } from './jwt.strategy';
import { Public } from './public.decorator';

/** 注册/登录/刷新公开且限流；成功走 HTTP 200 + 业务 envelope。 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Task 3.6 才实现旋转；占位同样限流，避免上线前被刷。 */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('refresh')
  refresh() {
    return {};
  }

  /** 需带 Bearer 的探测接口，用来验全局 JWT Guard（不走 @Public）。 */
  @Get('session')
  session(@Req() req: { user: AccessUser }) {
    return { userId: req.user.id };
  }
}
