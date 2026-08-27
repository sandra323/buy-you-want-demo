import { ErrorCode } from '@lightbuy/shared';

/** Client-safe Chinese copy keyed by business code (PRD appendix A). */
export const CLIENT_MESSAGE_BY_CODE: Record<ErrorCode, string> = {
  [ErrorCode.OK]: 'ok',
  [ErrorCode.VALIDATION]: '参数校验失败',
  [ErrorCode.UNAUTHORIZED_EXPIRED]: '登录已过期',
  [ErrorCode.UNAUTHORIZED_INVALID]: '登录无效',
  [ErrorCode.REFRESH_REVOKED]: '登录已失效',
  [ErrorCode.REFRESH_EXPIRED]: '登录已过期',
  [ErrorCode.UNAUTHORIZED_MISSING]: '未登录',
  [ErrorCode.AUTH_CREDENTIALS]: '手机号或密码错误',
  [ErrorCode.PHONE_TAKEN]: '手机号已注册',
  [ErrorCode.FORBIDDEN_RESERVED]: '无权限访问',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.CONFLICT_STOCK]: '库存不足',
  [ErrorCode.CONFLICT_STATE]: '当前状态不允许该操作',
  [ErrorCode.RATE_LIMITED]: '请求过于频繁',
  [ErrorCode.INTERNAL]: '服务器内部错误',
};
