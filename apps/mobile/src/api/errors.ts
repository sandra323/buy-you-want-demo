import { ErrorCode } from '@lightbuy/shared';

export const AUTH_CREDENTIALS_COPY = '手机号或密码错误';

export class ApiError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(
      code === ErrorCode.AUTH_CREDENTIALS ? AUTH_CREDENTIALS_COPY : message,
    );
    this.name = 'ApiError';
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
