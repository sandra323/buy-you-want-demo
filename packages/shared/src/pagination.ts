/** Pagination query defaults: page=1, pageSize=10, max pageSize=50. */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginatedData<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export const PAGINATION_DEFAULT_PAGE = 1;
export const PAGINATION_DEFAULT_PAGE_SIZE = 10;
export const PAGINATION_MAX_PAGE_SIZE = 50;
