import axios from 'axios';

import { installAuthInterceptors } from './interceptors';

function apiRoot(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

export const apiClient = axios.create({
  baseURL: `${apiRoot()}/api/v1`,
  timeout: 15_000,
  // Custom adapters (Jest) skip axios settle(); one interceptor path for HTTP + mocks.
  validateStatus: () => true,
});

installAuthInterceptors(apiClient);
