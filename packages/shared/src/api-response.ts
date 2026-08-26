import type { ErrorCode } from './error-codes';

/** Uniform response envelope. Errors use `data: null`. */
export interface ApiResponse<T> {
  code: ErrorCode;
  message: string;
  data: T | null;
}
