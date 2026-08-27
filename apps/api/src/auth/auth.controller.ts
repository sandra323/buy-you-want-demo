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
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import type { AccessUser } from './jwt.strategy';
import { Public } from './public.decorator';

const AUTH_TOKENS_EXAMPLE = {
  code: 0,
  message: 'ok',
  data: {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    refreshToken: 'a'.repeat(128),
    user: {
      id: '11111111-1111-1111-1111-111111111111',
      phoneMask: '138****0000',
      nickname: '用户0000',
      avatar: '',
    },
  },
};

/** 注册/登录/刷新公开且限流；成功走 HTTP 200 + 业务 envelope。 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('register')
  @ApiOperation({ summary: '注册并签发双 Token' })
  @ApiOkResponse({ schema: { example: AUTH_TOKENS_EXAMPLE } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: '登录并签发双 Token' })
  @ApiOkResponse({ schema: { example: AUTH_TOKENS_EXAMPLE } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Task 3.6 才实现旋转；占位同样限流，避免上线前被刷。 */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('refresh')
  @ApiOperation({
    summary: '刷新双 Token（旋转，Task 3.6）',
    description: '当前为占位；实现后 body 为 `{ refreshToken }`。',
  })
  refresh() {
    return {};
  }

  /** 需带 Bearer 的探测接口，用来验全局 JWT Guard（不走 @Public）。 */
  @Get('session')
  @ApiExcludeEndpoint()
  session(@Req() req: { user: AccessUser }) {
    return { userId: req.user.id };
  }
}
