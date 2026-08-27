import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@lightbuy/shared';

/** Maps business `code` to HTTP status (build-spec §7). */
export function httpStatusForCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.OK:
      return HttpStatus.OK;
    case ErrorCode.VALIDATION:
    case ErrorCode.AUTH_CREDENTIALS:
      return HttpStatus.BAD_REQUEST;
    case ErrorCode.UNAUTHORIZED_EXPIRED:
    case ErrorCode.UNAUTHORIZED_INVALID:
    case ErrorCode.REFRESH_REVOKED:
    case ErrorCode.REFRESH_EXPIRED:
    case ErrorCode.UNAUTHORIZED_MISSING:
      return HttpStatus.UNAUTHORIZED;
    case ErrorCode.PHONE_TAKEN:
    case ErrorCode.CONFLICT_STOCK:
    case ErrorCode.CONFLICT_STATE:
      return HttpStatus.CONFLICT;
    case ErrorCode.FORBIDDEN_RESERVED:
      return HttpStatus.FORBIDDEN;
    case ErrorCode.NOT_FOUND:
      return HttpStatus.NOT_FOUND;
    case ErrorCode.RATE_LIMITED:
      return HttpStatus.TOO_MANY_REQUESTS;
    case ErrorCode.INTERNAL:
      return HttpStatus.INTERNAL_SERVER_ERROR;
    default:
      return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}

/** Best-effort map for Nest HttpException / future guards (JWT, throttler). */
export function errorCodeFromHttpStatus(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.VALIDATION;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED_MISSING;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN_RESERVED;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ErrorCode.CONFLICT_STATE;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.RATE_LIMITED;
    case HttpStatus.SERVICE_UNAVAILABLE:
      return ErrorCode.INTERNAL;
    default:
      return status >= 500 ? ErrorCode.INTERNAL : ErrorCode.INTERNAL;
  }
}
