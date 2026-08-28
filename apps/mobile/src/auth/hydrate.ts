import { apiClient } from '../api/client';
import { refreshSession } from '../api/interceptors';
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
    await refreshSession(apiClient);
  } catch {
    await logoutLocal();
  } finally {
    useAuthStore.getState().setHydrating(false);
  }
}
