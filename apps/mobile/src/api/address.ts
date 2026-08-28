import type { Address, AddressInput, ApiResponse } from '@lightbuy/shared';

import { apiClient } from './client';
import { unwrapData } from './envelope';

export async function listAddresses(): Promise<Address[]> {
  const res = await apiClient.get<ApiResponse<Address[]>>('/addresses');
  return unwrapData(res.data);
}

export async function createAddress(body: AddressInput): Promise<Address> {
  const res = await apiClient.post<ApiResponse<Address>>('/addresses', body);
  return unwrapData(res.data);
}

export async function updateAddress(
  id: string,
  body: AddressInput,
): Promise<Address> {
  const res = await apiClient.put<ApiResponse<Address>>(
    `/addresses/${id}`,
    body,
  );
  return unwrapData(res.data);
}

export async function deleteAddress(id: string): Promise<{ ok: true }> {
  const res = await apiClient.delete<ApiResponse<{ ok: true }>>(
    `/addresses/${id}`,
  );
  return unwrapData(res.data);
}
