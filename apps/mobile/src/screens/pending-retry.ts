import type { PendingAction } from '../store/pending-action';

export type PendingFocusDecision = 'execute' | 'clear' | 'ignore';

/** 详情页重新获得焦点时：只处理「刚去登录」这条路径。 */
export function decidePendingRetryOnFocus(params: {
  pending: PendingAction | null;
  productId: string;
  awaitingLogin: boolean;
  isLoggedIn: boolean;
}): PendingFocusDecision {
  if (params.pending?.productId !== params.productId || !params.awaitingLogin) {
    return 'ignore';
  }
  return params.isLoggedIn ? 'execute' : 'clear';
}
