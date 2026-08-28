import { useCallback, useMemo } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Snackbar, Text } from 'react-native-paper';

import { getHome } from '../api/catalog';
import {
  EmptyState,
  ListSkeleton,
  ProductWaterfall,
  SortBar,
} from '../components';
import { useProductExposure } from '../hooks/useProductExposure';
import { useProductPagination } from '../hooks/useProductPagination';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { useCatalogFiltersStore } from '../store/catalog-filters';
import { tokens } from '../theme';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const onProductExposure = (_productId: string): void => undefined;

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const sort = useCatalogFiltersStore((s) => s.sort);
  const setSort = useCatalogFiltersStore((s) => s.setSort);

  const fetchPage = useCallback(
    (nextPage: number) => getHome({ sort, page: nextPage }),
    [sort],
  );
  const {
    items,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    hasError,
    errorVisible,
    refresh,
    retry,
    loadMore,
    dismissError,
  } = useProductPagination(fetchPage);
  const productIds = useMemo(() => items.map((item) => item.id), [items]);
  const {
    onViewportLayout,
    onScroll: trackExposure,
    onProductLayout,
  } = useProductExposure({ productIds, onExposure: onProductExposure });

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      trackExposure(event);
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      if (
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - 240
      ) {
        loadMore();
      }
    },
    [loadMore, trackExposure],
  );

  const showEmpty =
    !isInitialLoading && !isRefreshing && items.length === 0 && !hasError;

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
        }
        onLayout={onViewportLayout}
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
          <ProductWaterfall
            products={items}
            onProductPress={(productId) =>
              navigation.navigate('ProductDetail', { productId })
            }
            onProductLayout={onProductLayout}
          />
        ) : null}
        {isLoadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={tokens.color.primary} />
          </View>
        ) : null}
      </ScrollView>
      <Snackbar
        visible={errorVisible}
        onDismiss={dismissError}
        action={{ label: '重试', onPress: retry }}
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
  footer: {
    paddingVertical: tokens.space.lg,
    alignItems: 'center',
  },
});
