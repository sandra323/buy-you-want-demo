import type {
  AddCartItemRequest,
  ApiResponse,
  CartData,
  UpdateCartItemRequest,
} from '@lightbuy/shared';

import { apiClient } from './client';
import { unwrapData } from './envelope';

export async function getCart(): Promise<CartData> {
  const res = await apiClient.get<ApiResponse<CartData>>('/cart');
  return unwrapData(res.data);
}

export async function addCartItem(body: AddCartItemRequest): Promise<CartData> {
  const res = await apiClient.post<ApiResponse<CartData>>('/cart', body);
  return unwrapData(res.data);
}

export async function updateCartItem(
  id: string,
  body: UpdateCartItemRequest,
): Promise<CartData> {
  const res = await apiClient.patch<ApiResponse<CartData>>(`/cart/${id}`, body);
  return unwrapData(res.data);
}

export async function removeCartItem(id: string): Promise<CartData> {
  const res = await apiClient.delete<ApiResponse<CartData>>(`/cart/${id}`);
  return unwrapData(res.data);
}
