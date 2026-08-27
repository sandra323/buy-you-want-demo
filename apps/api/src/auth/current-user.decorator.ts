import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AccessUser } from './jwt.strategy';

/** 取 JWT Guard 挂到 request 上的当前用户（只有 id，资料再查库）。 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AccessUser }>();
    return request.user;
  },
);
