import type { User } from './user';

export interface RegisterRequest {
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthTokensData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LogoutData {
  ok: true;
}
