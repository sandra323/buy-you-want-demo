import type { ApiResponse, User } from '@lightbuy/shared';

import { apiClient } from './client';
import { unwrapData } from './envelope';

export async function getMe(): Promise<User> {
  const res = await apiClient.get<ApiResponse<User>>('/users/me');
  return unwrapData(res.data);
}
