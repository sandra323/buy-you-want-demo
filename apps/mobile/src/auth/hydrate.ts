import { persistSession } from './session';
import { refresh } from '../api/auth';
import { getRefreshToken } from '../storage/tokens';
import { useAuthStore } from '../store/auth';

export async function hydrateAuth(): Promise<void> {
  const { setHydrating, logoutLocal } = useAuthStore.getState();
  setHydrating(true);
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return;
    }
    // Spec: always hit /auth/refresh on cold start when a refresh token exists.
    const data = await refresh({ refreshToken });
    await persistSession(data);
  } catch {
    await logoutLocal();
  } finally {
    useAuthStore.getState().setHydrating(false);
  }
}
