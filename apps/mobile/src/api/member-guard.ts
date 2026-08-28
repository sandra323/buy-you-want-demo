import { ErrorCode } from '@lightbuy/shared';

import { useAuthStore } from '../store/auth';
import { ApiError } from './errors';

/** Shared gate for cart API helpers (Task 7.6). Guests must never hit those routes. */
export function requireMemberForCart(): string {
  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    throw new ApiError(ErrorCode.UNAUTHORIZED_MISSING, '请先登录');
  }
  return accessToken;
}
