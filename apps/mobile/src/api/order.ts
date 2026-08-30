import type {
  ApiResponse,
  CreateOrderRequest,
  Order,
  OrderListQuery,
  PaginatedData,
} from '@lightbuy/shared';

import { apiClient } from './client';
import { unwrapData } from './envelope';

export async function createOrder(body: CreateOrderRequest): Promise<Order> {
  const res = await apiClient.post<ApiResponse<Order>>('/orders', body);
  return unwrapData(res.data);
}

export async function listOrders(
  query: OrderListQuery = {},
): Promise<PaginatedData<Order>> {
  const res = await apiClient.get<ApiResponse<PaginatedData<Order>>>(
    '/orders',
    {
      params: {
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      },
    },
  );
  return unwrapData(res.data);
}

export async function getOrder(id: string): Promise<Order> {
  const res = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`);
  return unwrapData(res.data);
}

export async function payOrder(id: string): Promise<Order> {
  const res = await apiClient.post<ApiResponse<Order>>(`/orders/${id}/pay`);
  return unwrapData(res.data);
}

export async function cancelOrder(id: string): Promise<Order> {
  const res = await apiClient.post<ApiResponse<Order>>(`/orders/${id}/cancel`);
  return unwrapData(res.data);
}
