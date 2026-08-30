import type {
  ApiResponse,
  CatalogListQuery,
  PaginatedData,
  ProductCard,
  ProductDetail,
} from '@lightbuy/shared';

import { apiClient } from './client';
import { unwrapData } from './envelope';

export async function getHome(
  query: Omit<CatalogListQuery, 'keyword'> = {},
): Promise<PaginatedData<ProductCard>> {
  const res = await apiClient.get<ApiResponse<PaginatedData<ProductCard>>>(
    '/home',
    {
      params: { sort: query.sort, page: query.page, pageSize: query.pageSize },
    },
  );
  return unwrapData(res.data);
}

export async function listProducts(
  query: CatalogListQuery = {},
): Promise<PaginatedData<ProductCard>> {
  const res = await apiClient.get<ApiResponse<PaginatedData<ProductCard>>>(
    '/products',
    {
      params: {
        keyword: query.keyword,
        sort: query.sort,
        page: query.page,
        pageSize: query.pageSize,
      },
    },
  );
  return unwrapData(res.data);
}

export async function getProduct(id: string): Promise<ProductDetail> {
  const res = await apiClient.get<ApiResponse<ProductDetail>>(
    `/products/${id}`,
  );
  return unwrapData(res.data);
}
