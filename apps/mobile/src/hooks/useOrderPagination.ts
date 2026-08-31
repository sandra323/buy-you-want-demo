import { useCallback, useEffect, useRef, useState } from 'react';
import type { Order } from '@lightbuy/shared';

import { listOrders } from '../api/order';

export type OrderStatusFilter = 'all' | 0 | 1 | 2 | 3 | 4;

export function useOrderPagination(
  status: OrderStatusFilter,
  enabled: boolean,
) {
  const [items, setItems] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const loadingMoreRequestIdRef = useRef<number | null>(null);
  const pageOneLoadingRef = useRef(false);

  const load = useCallback(
    async (
      nextPage: number,
      mode: 'initial' | 'refresh' | 'silent' | 'more',
    ) => {
      const requestId = ++requestIdRef.current;
      if (mode !== 'more') {
        pageOneLoadingRef.current = true;
        loadingMoreRef.current = false;
        loadingMoreRequestIdRef.current = null;
        setIsLoadingMore(false);
      }
      if (mode === 'initial') {
        setIsInitialLoading(true);
      } else if (mode === 'refresh') {
        setIsRefreshing(true);
      } else if (mode === 'more') {
        setIsLoadingMore(true);
        loadingMoreRef.current = true;
        loadingMoreRequestIdRef.current = requestId;
      }
      try {
        const data = await listOrders({
          status: status === 'all' ? undefined : status,
          page: nextPage,
          pageSize: 10,
        });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setHasError(false);
        setPage(data.page);
        setTotal(data.total);
        setItems((current) => {
          if (mode !== 'more') {
            return data.items;
          }
          const seen = new Set(current.map((item) => item.id));
          return [
            ...current,
            ...data.items.filter((item) => !seen.has(item.id)),
          ];
        });
      } catch {
        if (requestId === requestIdRef.current) {
          setHasError(true);
        }
      } finally {
        if (mode === 'more' && loadingMoreRequestIdRef.current === requestId) {
          setIsLoadingMore(false);
          loadingMoreRef.current = false;
          loadingMoreRequestIdRef.current = null;
        }
        if (requestId === requestIdRef.current) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
          pageOneLoadingRef.current = false;
        }
      }
    },
    [status],
  );

  useEffect(() => {
    requestIdRef.current += 1;
    loadingMoreRef.current = false;
    loadingMoreRequestIdRef.current = null;
    pageOneLoadingRef.current = false;
    setItems([]);
    setPage(1);
    setTotal(0);
    setHasError(false);
    setIsInitialLoading(enabled);
    setIsRefreshing(false);
    setIsLoadingMore(false);
    if (enabled) {
      void load(1, 'initial');
    }
  }, [enabled, load]);

  const refresh = useCallback(() => {
    if (enabled && !pageOneLoadingRef.current) {
      void load(1, 'refresh');
    }
  }, [enabled, load]);

  const refetch = useCallback(() => {
    if (enabled && !pageOneLoadingRef.current) {
      void load(1, 'silent');
    }
  }, [enabled, load]);

  const hasMore = items.length < total;
  const loadMore = useCallback(() => {
    if (
      !enabled ||
      isInitialLoading ||
      isRefreshing ||
      isLoadingMore ||
      loadingMoreRef.current ||
      pageOneLoadingRef.current ||
      !hasMore
    ) {
      return;
    }
    void load(page + 1, 'more');
  }, [
    enabled,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    isRefreshing,
    load,
    page,
  ]);

  return {
    items,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    hasError,
    refresh,
    refetch,
    retry: refresh,
    loadMore,
    dismissError: () => setHasError(false),
  };
}
