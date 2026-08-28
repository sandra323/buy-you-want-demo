import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { AxiosError } from 'axios';
import {
  ErrorCode,
  type ApiResponse,
  type AuthTokensData,
} from '@lightbuy/shared';

import { persistSession } from '../auth/session';
import { notifyCheckoutLoginExpired } from '../auth/session-expiry';
import { getRefreshToken } from '../storage/tokens';
import { useAuthStore } from '../store/auth';
import { unwrapData } from './envelope';
import { ApiError } from './errors';

type RetryConfig = InternalAxiosRequestConfig & { _replayed?: boolean };

let refreshPromise: Promise<void> | null = null;
let installed = false;

export function resetAuthInterceptorState(): void {
  refreshPromise = null;
}

function pathnameOf(config: InternalAxiosRequestConfig): string {
  const url = config.url ?? '';
  try {
    const parsed = url.startsWith('http')
      ? new URL(url)
      : new URL(url, config.baseURL);
    return parsed.pathname;
  } catch {
    return url;
  }
}

function isPublicAuthRequest(config: InternalAxiosRequestConfig): boolean {
  return /\/auth\/(login|register|refresh)\/?$/.test(pathnameOf(config));
}

function isRefreshRequest(config: InternalAxiosRequestConfig): boolean {
  return /\/auth\/refresh\/?$/.test(pathnameOf(config));
}

function envelopeCode(data: unknown): ErrorCode | undefined {
  if (data && typeof data === 'object' && 'code' in data) {
    const code = (data as ApiResponse<unknown>).code;
    return typeof code === 'number' ? code : undefined;
  }
  return undefined;
}

function envelopeMessage(data: unknown): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as ApiResponse<unknown>).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return '请求失败';
}

function refreshSingleFlight(client: AxiosInstance): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = runRefresh(client).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Cold-start hydrate and 40100 replay share this lock so rotation cannot double-fire. */
export function refreshSession(client: AxiosInstance): Promise<void> {
  return refreshSingleFlight(client);
}

async function runRefresh(client: AxiosInstance): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await useAuthStore.getState().logoutLocal();
    notifyCheckoutLoginExpired();
    throw new ApiError(ErrorCode.UNAUTHORIZED_MISSING, '请先登录');
  }
  const res = await client.post<ApiResponse<AuthTokensData>>('/auth/refresh', {
    refreshToken,
  });
  await persistSession(unwrapData(res.data));
}

async function onRefreshEndpointFailure(code: unknown): Promise<void> {
  if (
    code === ErrorCode.REFRESH_REVOKED ||
    code === ErrorCode.REFRESH_EXPIRED ||
    code === ErrorCode.AUTH_CREDENTIALS
  ) {
    await useAuthStore.getState().logoutLocal();
    notifyCheckoutLoginExpired();
  }
}

async function replayAfterRefresh(
  client: AxiosInstance,
  config: RetryConfig,
): Promise<AxiosResponse> {
  await refreshSingleFlight(client);
  config._replayed = true;
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return client(config);
}

export function installAuthInterceptors(client: AxiosInstance): void {
  if (installed) {
    return;
  }
  installed = true;

  client.interceptors.request.use((config) => {
    if (isPublicAuthRequest(config)) {
      if (config.headers) {
        config.headers.Authorization = undefined;
        if (typeof config.headers.delete === 'function') {
          config.headers.delete('Authorization');
        }
      }
      return config;
    }
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  client.interceptors.response.use(
    async (response) => {
      const config = response.config as RetryConfig;
      const code = envelopeCode(response.data);
      const status = response.status;

      if (isRefreshRequest(config)) {
        if (code !== undefined && code !== ErrorCode.OK) {
          await onRefreshEndpointFailure(code);
          throw new ApiError(code, envelopeMessage(response.data));
        }
        return response;
      }

      if (
        status === 401 &&
        (code === ErrorCode.UNAUTHORIZED_INVALID ||
          code === ErrorCode.UNAUTHORIZED_MISSING)
      ) {
        if (!useAuthStore.getState().isHydrating) {
          await useAuthStore.getState().logoutLocal();
        }
        throw new ApiError(code, envelopeMessage(response.data));
      }

      if (status === 401 && code === ErrorCode.UNAUTHORIZED_EXPIRED) {
        if (config._replayed) {
          throw new ApiError(code, envelopeMessage(response.data));
        }
        try {
          return await replayAfterRefresh(client, config);
        } catch (error) {
          throw error instanceof ApiError
            ? error
            : new ApiError(code, envelopeMessage(response.data));
        }
      }

      if (code !== undefined && code !== ErrorCode.OK) {
        throw new ApiError(code, envelopeMessage(response.data));
      }
      return response;
    },
    async (error: AxiosError<ApiResponse<unknown>>) => {
      const config = error.config as RetryConfig | undefined;
      const status = error.response?.status;
      const code = envelopeCode(error.response?.data);
      const apiError =
        code !== undefined
          ? new ApiError(code, envelopeMessage(error.response?.data))
          : error;

      if (!config) {
        return Promise.reject(apiError);
      }

      if (isRefreshRequest(config)) {
        await onRefreshEndpointFailure(code);
        return Promise.reject(apiError);
      }

      if (
        status === 401 &&
        (code === ErrorCode.UNAUTHORIZED_INVALID ||
          code === ErrorCode.UNAUTHORIZED_MISSING)
      ) {
        if (!useAuthStore.getState().isHydrating) {
          await useAuthStore.getState().logoutLocal();
        }
        return Promise.reject(apiError);
      }

      if (status === 401 && code === ErrorCode.UNAUTHORIZED_EXPIRED) {
        if (config._replayed) {
          return Promise.reject(apiError);
        }
        try {
          return await replayAfterRefresh(client, config);
        } catch (error) {
          return Promise.reject(error instanceof ApiError ? error : apiError);
        }
      }

      return Promise.reject(apiError);
    },
  );
}
