import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ProductCard as ProductCardData } from '@lightbuy/shared';
import { Snackbar, Text } from 'react-native-paper';

import { getHome } from '../api/catalog';
import {
  EmptyState,
  ListSkeleton,
  ProductCard,
  SortBar,
  estimateProductCardHeight,
} from '../components';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { useCatalogFiltersStore } from '../store/catalog-filters';
import { tokens } from '../theme';
import { getImageAspectRatio } from '../utils/image-aspect-ratio';
import { distributeWaterfallColumns } from '../utils/waterfall-columns';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const { width } = useWindowDimensions();
  const sort = useCatalogFiltersStore((s) => s.sort);
  const setSort = useCatalogFiltersStore((s) => s.setSort);

  const [items, setItems] = useState<ProductCardData[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const cardWidth = Math.floor(
    (width - tokens.space.lg * 2 - tokens.space.md) / 2,
  );
  const hasMore = items.length < total;

  const bumpLayout = useCallback(() => {
    setLayoutVersion((v) => v + 1);
  }, []);

  const loadPage = useCallback(
    async (nextPage: number, mode: 'initial' | 'refresh' | 'more') => {
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
        const data = await getHome({ sort, page: nextPage });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setErrorVisible(false);
        setTotal(data.total);
        setPage(data.page);
        setItems((prev) => {
          if (mode === 'more' && nextPage > 1) {
            const seen = new Set(prev.map((item) => item.id));
            const merged = [...prev];
            for (const item of data.items) {
              if (!seen.has(item.id)) {
                merged.push(item);
              }
            }
            return merged;
          }
          return data.items;
        });
      } catch {
        if (requestId !== requestIdRef.current) {
          return;
        }
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
    [sort],
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    setTotal(0);
    void loadPage(1, 'initial');
  }, [sort, loadPage]);

  const handleRefresh = useCallback(() => {
    void loadPage(1, 'refresh');
  }, [loadPage]);

  const handleRetry = useCallback(() => {
    setErrorVisible(false);
    // 重试一律从第 1 页拉取，避免 load more 失败后只替换为单页数据。
    void loadPage(1, items.length === 0 ? 'initial' : 'refresh');
  }, [items.length, loadPage]);

  const handleLoadMore = useCallback(() => {
    if (
      isInitialLoading ||
      isRefreshing ||
      isLoadingMore ||
      loadingMoreRef.current ||
      !hasMore
    ) {
      return;
    }
    void loadPage(page + 1, 'more');
  }, [hasMore, isInitialLoading, isLoadingMore, isRefreshing, loadPage, page]);

  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        layoutMeasurement: { height: number };
        contentOffset: { y: number };
        contentSize: { height: number };
      };
    }) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      if (
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - 240
      ) {
        handleLoadMore();
      }
    },
    [handleLoadMore],
  );

  const estimateHeight = useCallback(
    (product: ProductCardData) =>
      estimateProductCardHeight(
        cardWidth,
        getImageAspectRatio(product.mainImage),
      ),
    [cardWidth],
  );

  const [leftColumn, rightColumn] = useMemo(() => {
    void layoutVersion;
    return distributeWaterfallColumns(items, estimateHeight);
  }, [estimateHeight, items, layoutVersion]);

  const showEmpty =
    !isInitialLoading && !isRefreshing && items.length === 0 && !errorVisible;

  const renderColumn = (columnItems: ProductCardData[]) =>
    columnItems.map((product) => (
      <ProductCard
        key={product.id}
        product={product}
        width={cardWidth}
        onAspectRatioChange={bumpLayout}
        onPress={() =>
          navigation.navigate('ProductDetail', { productId: product.id })
        }
      />
    ));

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="搜索"
          onPress={() => navigation.navigate('Search')}
          style={styles.search}
        >
          <Text style={styles.searchText}>搜索商品</Text>
        </Pressable>
        <SortBar value={sort} onChange={setSort} />
        {isInitialLoading ? (
          <ListSkeleton rows={4} />
        ) : showEmpty ? (
          <EmptyState
            title="暂无商品"
            description="稍后再来看看"
            illustration={
              <MaterialCommunityIcons
                name="shopping-outline"
                size={48}
                color={tokens.color.textTertiary}
              />
            }
          />
        ) : items.length > 0 ? (
          <View style={styles.waterfall}>
            <View style={styles.column}>{renderColumn(leftColumn)}</View>
            <View style={styles.column}>{renderColumn(rightColumn)}</View>
          </View>
        ) : null}
        {isLoadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={tokens.color.primary} />
          </View>
        ) : null}
      </ScrollView>
      <Snackbar
        visible={errorVisible}
        onDismiss={() => setErrorVisible(false)}
        action={{ label: '重试', onPress: handleRetry }}
      >
        加载失败，请重试
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: tokens.space.xl,
  },
  search: {
    margin: tokens.space.lg,
    minHeight: tokens.minTouch,
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.surface,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.lg,
  },
  searchText: {
    color: tokens.color.textTertiary,
  },
  waterfall: {
    flexDirection: 'row',
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
    gap: tokens.space.md,
  },
  column: {
    flex: 1,
  },
  footer: {
    paddingVertical: tokens.space.lg,
    alignItems: 'center',
  },
});
