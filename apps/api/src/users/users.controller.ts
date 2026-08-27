import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AccessUser } from '../auth/jwt.strategy';
import { SWAGGER_BEARER_AUTH } from '../http/setup-swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '当前登录用户（手机号脱敏）' })
  @ApiOkResponse({
    description: '业务 envelope，data 为公开用户',
    schema: {
      example: {
        code: 0,
        message: 'ok',
        data: {
          id: '11111111-1111-1111-1111-111111111111',
          phoneMask: '138****0000',
          nickname: '用户0000',
          avatar: '',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: '缺少/过期/无效 Access，或账号已封禁',
    schema: {
      example: { code: 40110, message: '未登录', data: null },
    },
  })
  me(@CurrentUser() user: AccessUser) {
    return this.usersService.getMe(user.id);
  }
}
