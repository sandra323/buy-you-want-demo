import type { ApiResponse } from '@lightbuy/shared';

export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return 'code' in value && 'message' in value && 'data' in value;
}
