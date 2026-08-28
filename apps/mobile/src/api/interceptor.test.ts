import { ErrorCode, type User } from '@lightbuy/shared';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';

import { apiClient } from './client';
import { ApiError } from './errors';
import { resetAuthInterceptorState } from './interceptors';
import { requireMemberForCart } from './member-guard';
import { saveTokens } from '../storage/tokens';
import { useAuthStore } from '../store/auth';
import { useCartBadgeStore } from '../store/cart-badge';
import { __resetSecureStore } from '../test/mocks/expo-secure-store';
import { __resetAsyncStorage } from '../test/mocks/async-storage';

const USER: User = {
  id: 'u1',
  phoneMask: '138****0000',
  nickname: 'demo',
  avatar: '',
};

function pathnameOf(config: InternalAxiosRequestConfig): string {
  return new URL(config.url ?? '', config.baseURL).pathname;
}

function envelope(
  config: InternalAxiosRequestConfig,
  status: number,
  code: number,
  data: unknown,
) {
  return {
    data: { code, message: code === 0 ? 'ok' : 'error', data },
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config,
  };
}

async function resetStores() {
  resetAuthInterceptorState();
  __resetSecureStore();
  __resetAsyncStorage();
  useCartBadgeStore.getState().reset();
  await useAuthStore.getState().logoutLocal();
  useAuthStore.setState({ isHydrating: false });
}

describe('axios auth interceptor', () => {
  beforeEach(async () => {
    await resetStores();
    apiClient.defaults.adapter = undefined;
  });

  it('single-flights N parallel 40100 into one refresh', async () => {
    await saveTokens('expired-access', 'refresh-raw');
    useAuthStore.getState().setSession(USER, 'expired-access');

    let refreshCount = 0;
    const adapter: AxiosAdapter = async (config) => {
      const path = pathnameOf(config);
      if (path.endsWith('/auth/refresh')) {
        refreshCount += 1;
        expect(config.headers.Authorization).toBeUndefined();
        return envelope(config, 200, 0, {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          user: USER,
        });
      }

      const retried = Boolean(
        (config as InternalAxiosRequestConfig & { _replayed?: boolean })
          ._replayed,
      );
      if (!retried) {
        return envelope(config, 401, ErrorCode.UNAUTHORIZED_EXPIRED, null);
      }
      return envelope(config, 200, 0, { ok: true });
    };
    apiClient.defaults.adapter = adapter;

    const results = await Promise.all([
      apiClient.get('/users/me'),
      apiClient.get('/users/me'),
      apiClient.get('/users/me'),
    ]);

    expect(refreshCount).toBe(1);
    expect(results).toHaveLength(3);
    expect(useAuthStore.getState().accessToken).toBe('new-access');
  });

  it('does not refresh again when /auth/refresh returns 40102', async () => {
    await saveTokens('expired-access', 'refresh-raw');
    useAuthStore.getState().setSession(USER, 'expired-access');

    let refreshCount = 0;
    const adapter: AxiosAdapter = async (config) => {
      const path = pathnameOf(config);
      if (path.endsWith('/auth/refresh')) {
        refreshCount += 1;
        return envelope(config, 401, ErrorCode.REFRESH_REVOKED, null);
      }
      return envelope(config, 401, ErrorCode.UNAUTHORIZED_EXPIRED, null);
    };
    apiClient.defaults.adapter = adapter;

    await expect(apiClient.get('/users/me')).rejects.toBeInstanceOf(ApiError);
    await expect(apiClient.get('/users/me')).rejects.toBeInstanceOf(ApiError);

    expect(refreshCount).toBe(1);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('does not refresh on 40101', async () => {
    await saveTokens('bad-access', 'refresh-raw');
    useAuthStore.getState().setSession(USER, 'bad-access');

    let refreshCount = 0;
    const adapter: AxiosAdapter = async (config) => {
      const path = pathnameOf(config);
      if (path.endsWith('/auth/refresh')) {
        refreshCount += 1;
        return envelope(config, 200, 0, {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          user: USER,
        });
      }
      return envelope(config, 401, ErrorCode.UNAUTHORIZED_INVALID, null);
    };
    apiClient.defaults.adapter = adapter;

    await expect(apiClient.get('/users/me')).rejects.toMatchObject({
      code: ErrorCode.UNAUTHORIZED_INVALID,
    });
    expect(refreshCount).toBe(0);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('does not loop refresh when replay still returns 40100', async () => {
    await saveTokens('expired-access', 'refresh-raw');
    useAuthStore.getState().setSession(USER, 'expired-access');

    let refreshCount = 0;
    const adapter: AxiosAdapter = async (config) => {
      const path = pathnameOf(config);
      if (path.endsWith('/auth/refresh')) {
        refreshCount += 1;
        return envelope(config, 200, 0, {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          user: USER,
        });
      }
      return envelope(config, 401, ErrorCode.UNAUTHORIZED_EXPIRED, null);
    };
    apiClient.defaults.adapter = adapter;

    await expect(apiClient.get('/users/me')).rejects.toMatchObject({
      code: ErrorCode.UNAUTHORIZED_EXPIRED,
    });
    expect(refreshCount).toBe(1);
  });

  it('hydrate and 40100 replay share one refresh', async () => {
    const { hydrateAuth } = await import('../auth/hydrate');
    await saveTokens('expired-access', 'refresh-raw');
    useAuthStore.getState().setSession(USER, 'expired-access');

    let refreshCount = 0;
    const adapter: AxiosAdapter = async (config) => {
      const path = pathnameOf(config);
      if (path.endsWith('/auth/refresh')) {
        refreshCount += 1;
        return envelope(config, 200, 0, {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          user: USER,
        });
      }
      const retried = Boolean(
        (config as InternalAxiosRequestConfig & { _replayed?: boolean })
          ._replayed,
      );
      if (!retried) {
        return envelope(config, 401, ErrorCode.UNAUTHORIZED_EXPIRED, null);
      }
      return envelope(config, 200, 0, { ok: true });
    };
    apiClient.defaults.adapter = adapter;

    await Promise.all([hydrateAuth(), apiClient.get('/users/me')]);
    expect(refreshCount).toBe(1);
    expect(useAuthStore.getState().accessToken).toBe('new-access');
  });

  it('does not wipe refresh token on 40110 while hydrating', async () => {
    await saveTokens('access', 'refresh-raw');
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isHydrating: true,
    });

    const adapter: AxiosAdapter = async (config) =>
      envelope(config, 401, ErrorCode.UNAUTHORIZED_MISSING, null);
    apiClient.defaults.adapter = adapter;

    await expect(apiClient.get('/cart')).rejects.toMatchObject({
      code: ErrorCode.UNAUTHORIZED_MISSING,
    });
    const { getRefreshToken } = await import('../storage/tokens');
    expect(await getRefreshToken()).toBe('refresh-raw');
  });

  it('blocks guest cart helper', () => {
    useAuthStore.setState({ user: null, accessToken: null });
    expect(() => requireMemberForCart()).toThrow(ApiError);
    try {
      requireMemberForCart();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe(ErrorCode.UNAUTHORIZED_MISSING);
    }

    useAuthStore.getState().setSession(USER, 'access');
    expect(requireMemberForCart()).toBe('access');
  });
});
