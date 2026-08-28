import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { PaginatedData, ProductCard } from '@lightbuy/shared';
import { Snackbar, Text, TextInput } from 'react-native-paper';

import { listProducts } from '../api/catalog';
import {
  EmptyState,
  ListSkeleton,
  ProductWaterfall,
  SortBar,
} from '../components';
import { useProductExposure } from '../hooks/useProductExposure';
import { useProductPagination } from '../hooks/useProductPagination';
import type { RootStackParamList } from '../navigation/types';
import { addSearchHistory, readSearchHistory } from '../storage/search-history';
import { useAuthStore } from '../store/auth';
import { useCatalogFiltersStore } from '../store/catalog-filters';
import { tokens } from '../theme';

type SearchPage = PaginatedData<ProductCard> & {
  isFallback?: boolean;
};

const onProductExposure = (_productId: string): void => undefined;

export function SearchScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((state) => state.user);
  const sort = useCatalogFiltersStore((state) => state.sort);
  const setSort = useCatalogFiltersStore((state) => state.setSort);
  const setKeyword = useCatalogFiltersStore((state) => state.setKeyword);
  const resetKeyword = useCatalogFiltersStore((state) => state.resetKeyword);

  const [input, setInput] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (user) {
        void readSearchHistory().then((entries) => {
          if (active) {
            setHistory(entries);
          }
        });
      } else {
        setHistory([]);
      }
      return () => {
        active = false;
        resetKeyword();
      };
    }, [resetKeyword, user]),
  );

  const fetchPage = useCallback(
    async (page: number): Promise<SearchPage> =>
      listProducts({ keyword: submittedKeyword ?? undefined, sort, page }),
    [sort, submittedKeyword],
  );

  const {
    items,
    firstPage,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    hasError,
    errorVisible,
    refresh,
    retry,
    loadMore,
    dismissError,
  } = useProductPagination<SearchPage>(fetchPage, submittedKeyword !== null);
  const productIds = useMemo(() => items.map((item) => item.id), [items]);
  const {
    onViewportLayout,
    onScroll: trackExposure,
    onProductLayout,
  } = useProductExposure({ productIds, onExposure: onProductExposure });

  const submitSearch = useCallback(
    (value: string) => {
      const keyword = value.trim();
      if (!keyword) {
        return;
      }
      setInput(keyword);
      setKeyword(keyword);
      setSubmittedKeyword(keyword);
      if (user) {
        void addSearchHistory(keyword).then(setHistory);
      }
    },
    [setKeyword, user],
  );

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

  const isFallback =
    Boolean(firstPage?.isFallback) ||
    items.some((product) => product.isFallback === true);
  const hasSearched = submittedKeyword !== null;
  const showEmpty =
    hasSearched &&
    !isInitialLoading &&
    !isRefreshing &&
    items.length === 0 &&
    !hasError;

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          hasSearched ? (
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />
          ) : undefined
        }
        onLayout={onViewportLayout}
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        <View style={styles.searchRow}>
          <TextInput
            mode="outlined"
            label="搜索商品"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => submitSearch(input)}
            returnKeyType="search"
            autoCapitalize="none"
            style={styles.searchInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="提交搜索"
            onPress={() => submitSearch(input)}
            style={({ pressed }) => [
              styles.searchButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.searchButtonText}>搜索</Text>
          </Pressable>
        </View>

        {user && history.length > 0 && !hasSearched ? (
          <View style={styles.history}>
            <Text variant="titleMedium">搜索历史</Text>
            <View style={styles.historyItems}>
              {history.map((keyword) => (
                <Pressable
                  key={keyword}
                  accessibilityRole="button"
                  onPress={() => submitSearch(keyword)}
                  style={({ pressed }) => [
                    styles.historyItem,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text>{keyword}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {hasSearched ? <SortBar value={sort} onChange={setSort} /> : null}

        {isFallback && hasSearched ? (
          <View style={styles.fallback}>
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color={tokens.color.textSecondary}
            />
            <Text style={styles.fallbackText}>
              未找到完全匹配的商品，为你推荐以下商品
            </Text>
          </View>
        ) : null}

        {isInitialLoading ? (
          <ListSkeleton rows={4} />
        ) : showEmpty ? (
          <EmptyState
            title="暂无匹配商品"
            description={
              isFallback ? '推荐商品也暂时为空，请稍后再试' : '换个关键词试试'
            }
            illustration={
              <MaterialCommunityIcons
                name="magnify-close"
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
        ) : !hasSearched ? (
          <EmptyState
            title="搜索你想要的商品"
            description={
              user ? '也可以点击上方历史关键词' : '输入关键词开始搜索'
            }
            illustration={
              <MaterialCommunityIcons
                name="magnify"
                size={48}
                color={tokens.color.textTertiary}
              />
            }
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
        搜索失败，请重试
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.lg,
  },
  searchInput: {
    flex: 1,
    backgroundColor: tokens.color.surface,
  },
  searchButton: {
    minWidth: 64,
    minHeight: tokens.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.primary,
  },
  searchButtonText: {
    color: tokens.color.surface,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  history: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.lg,
    gap: tokens.space.md,
  },
  historyItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
  },
  historyItem: {
    minHeight: tokens.minTouch,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.surface,
  },
  fallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginHorizontal: tokens.space.lg,
    marginTop: tokens.space.md,
    padding: tokens.space.md,
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.primarySoft,
  },
  fallbackText: {
    flex: 1,
    color: tokens.color.textSecondary,
  },
  footer: {
    paddingVertical: tokens.space.lg,
    alignItems: 'center',
  },
});
