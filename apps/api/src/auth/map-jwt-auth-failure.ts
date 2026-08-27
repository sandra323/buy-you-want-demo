import { ErrorCode } from '@lightbuy/shared';
import { AppException } from '../http/app.exception';

function errorName(value: unknown): string | undefined {
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === 'string' ? name : undefined;
  }
  return undefined;
}

/** Map passport-jwt / jsonwebtoken failures to spec codes. Never uses 40301. */
export function throwForJwtAuthFailure(err: unknown, info: unknown): never {
  if (err instanceof AppException) {
    throw err;
  }
  if (err) {
    throw err;
  }

  const name = errorName(info);
  if (name === 'TokenExpiredError') {
    throw new AppException(ErrorCode.UNAUTHORIZED_EXPIRED);
  }
  if (name === 'JsonWebTokenError' || name === 'NotBeforeError') {
    throw new AppException(ErrorCode.UNAUTHORIZED_INVALID);
  }

  throw new AppException(ErrorCode.UNAUTHORIZED_MISSING);
}
