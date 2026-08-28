import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaginatedData, ProductCard } from '@lightbuy/shared';

type LoadMode = 'initial' | 'refresh' | 'more';

type ProductPage = PaginatedData<ProductCard>;

type UseProductPaginationResult<TPage extends ProductPage> = {
  items: ProductCard[];
  firstPage: TPage | null;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasError: boolean;
  errorVisible: boolean;
  hasMore: boolean;
  refresh: () => void;
  retry: () => void;
  loadMore: () => void;
  dismissError: () => void;
};

export function useProductPagination<TPage extends ProductPage>(
  fetchPage: (page: number) => Promise<TPage>,
  enabled = true,
): UseProductPaginationResult<TPage> {
  const [items, setItems] = useState<ProductCard[]>([]);
  const [firstPage, setFirstPage] = useState<TPage | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);

  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const itemsRef = useRef<ProductCard[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const loadPage = useCallback(
    async (nextPage: number, mode: LoadMode) => {
      const requestId = ++requestIdRef.current;
      if (mode === 'initial') {
        setIsInitialLoading(true);
      } else if (mode === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsLoadingMore(true);
        loadingMoreRef.current = true;
      }

      try {
        const data = await fetchPage(nextPage);
        if (requestId !== requestIdRef.current) {
          return;
        }
        setHasError(false);
        setErrorVisible(false);
        setTotal(data.total);
        setPage(data.page);
        if (nextPage === 1) {
          setFirstPage(data);
        }
        setItems((previous) => {
          if (mode !== 'more' || nextPage === 1) {
            return data.items;
          }
          const seen = new Set(previous.map((item) => item.id));
          return [
            ...previous,
            ...data.items.filter((item) => !seen.has(item.id)),
          ];
        });
      } catch {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setHasError(true);
        setErrorVisible(true);
      } finally {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setIsInitialLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    requestIdRef.current += 1;
    itemsRef.current = [];
    setItems([]);
    setFirstPage(null);
    setPage(1);
    setTotal(0);
    setHasError(false);
    setErrorVisible(false);
    setIsInitialLoading(enabled);
    if (enabled) {
      void loadPage(1, 'initial');
    }
  }, [enabled, loadPage]);

  const refresh = useCallback(() => {
    if (enabled) {
      void loadPage(1, 'refresh');
    }
  }, [enabled, loadPage]);

  const retry = useCallback(() => {
    if (!enabled) {
      return;
    }
    setErrorVisible(false);
    void loadPage(1, itemsRef.current.length === 0 ? 'initial' : 'refresh');
  }, [enabled, loadPage]);

  const hasMore = items.length < total;
  const loadMore = useCallback(() => {
    if (
      !enabled ||
      isInitialLoading ||
      isRefreshing ||
      isLoadingMore ||
      loadingMoreRef.current ||
      !hasMore
    ) {
      return;
    }
    void loadPage(page + 1, 'more');
  }, [
    enabled,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    isRefreshing,
    loadPage,
    page,
  ]);

  return {
    items,
    firstPage,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    hasError,
    errorVisible,
    hasMore,
    refresh,
    retry,
    loadMore,
    dismissError: () => setErrorVisible(false),
  };
}
