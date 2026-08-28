import type {
  ApiResponse,
  AuthTokensData,
  LoginRequest,
  LogoutData,
  RefreshRequest,
  RegisterRequest,
} from '@lightbuy/shared';

import { apiClient } from './client';
import { unwrapData } from './envelope';

export async function register(body: RegisterRequest): Promise<AuthTokensData> {
  const res = await apiClient.post<ApiResponse<AuthTokensData>>(
    '/auth/register',
    body,
  );
  return unwrapData(res.data);
}

export async function login(body: LoginRequest): Promise<AuthTokensData> {
  const res = await apiClient.post<ApiResponse<AuthTokensData>>(
    '/auth/login',
    body,
  );
  return unwrapData(res.data);
}

export async function refresh(body: RefreshRequest): Promise<AuthTokensData> {
  const res = await apiClient.post<ApiResponse<AuthTokensData>>(
    '/auth/refresh',
    body,
  );
  return unwrapData(res.data);
}

export async function logout(): Promise<LogoutData> {
  const res = await apiClient.post<ApiResponse<LogoutData>>('/auth/logout');
  return unwrapData(res.data);
}
