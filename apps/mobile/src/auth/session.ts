import type { AuthTokensData } from '@lightbuy/shared';

import { saveTokens } from '../storage/tokens';
import { useAuthStore } from '../store/auth';

export async function persistSession(data: AuthTokensData): Promise<void> {
  await saveTokens(data.accessToken, data.refreshToken);
  useAuthStore.getState().setSession(data.user, data.accessToken);
}
