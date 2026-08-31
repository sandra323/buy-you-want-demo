import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Order } from '@lightbuy/shared';
import { Image } from 'expo-image';
import { Button, Chip, Snackbar, Text } from 'react-native-paper';

import {
  EmptyState,
  LoginGate,
  PriceText,
  RowListSkeleton,
} from '../components';
import {
  type OrderStatusFilter,
  useOrderPagination,
} from '../hooks/useOrderPagination';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth';
import { tokens } from '../theme';
import {
  emptyOrderCopy,
  ORDER_STATUS_TABS,
  orderStatusLabel,
} from '../utils/order-status';
import {
  shouldRefreshOnAppResume,
  shouldRefreshOnResume,
} from '../utils/refresh-on-resume';

type OrderListNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'OrderList'
>;

export function OrderListScreen() {
  const navigation = useNavigation<OrderListNavigation>();
  const isFocused = useIsFocused();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const [status, setStatus] = useState<OrderStatusFilter>('all');
  const {
    items,
    isInitialLoading,
    isRefreshing,
    isLoadingMore,
    hasError,
    refresh,
    refetch,
    retry,
    loadMore,
    dismissError,
  } = useOrderPagination(status, Boolean(user));
  const wasFocusedRef = useRef<boolean | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (shouldRefreshOnResume(wasFocusedRef.current, isFocused)) {
      refetch();
    }
    wasFocusedRef.current = isFocused;
  }, [isFocused, refetch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (shouldRefreshOnAppResume(appStateRef.current, nextState, isFocused)) {
        refetch();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [isFocused, refetch]);

  if (isHydrating) {
    return <View style={styles.page} />;
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <LoginGate title="登录后查看订单" description="订单仅对当前账号可见" />
      </View>
    );
  }

  function renderOrder({ item }: { item: Order }) {
    const count = item.items.reduce((sum, line) => sum + line.quantity, 0);
    return (
      <Pressable
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
        style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderNo}>订单 {item.orderNo}</Text>
          <Chip compact>{orderStatusLabel(item.status)}</Chip>
        </View>
        <View style={styles.summary}>
          <Image source={{ uri: item.items[0]?.image }} style={styles.image} />
          <View style={styles.summaryBody}>
            <Text numberOfLines={2}>
              {item.items[0]?.productName ?? '订单商品'}
            </Text>
            <Text style={styles.meta}>
              共 {count} 件
              {item.items.length > 1 ? `，含 ${item.items.length} 种商品` : ''}
            </Text>
          </View>
          <PriceText price={item.totalAmount} size="sm" />
        </View>
        <Text style={styles.createdAt}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.page}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={styles.tabBar}
      >
        {ORDER_STATUS_TABS.map((tab) => (
          <Button
            key={String(tab.value)}
            compact
            mode={status === tab.value ? 'contained' : 'text'}
            onPress={() => setStatus(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </ScrollView>
      {isInitialLoading ? (
        <RowListSkeleton />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={[
            styles.list,
            items.length === 0 && styles.emptyList,
          ]}
          refreshing={isRefreshing}
          onRefresh={refresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            hasError ? (
              <EmptyState
                title="订单加载失败"
                description="请检查网络后重试"
                ctaLabel="重试"
                onCtaPress={retry}
              />
            ) : (
              <EmptyState
                title={emptyOrderCopy(status)}
                description="去首页看看喜欢的商品"
                illustration={
                  <MaterialCommunityIcons
                    name="script-text-outline"
                    size={64}
                    color={tokens.color.textTertiary}
                  />
                }
                ctaLabel="去逛逛"
                onCtaPress={() =>
                  navigation.navigate('MainTabs', { screen: 'Home' })
                }
              />
            )
          }
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                color={tokens.color.primary}
                style={styles.loadingMore}
              />
            ) : null
          }
        />
      )}
      <Snackbar
        visible={hasError && items.length > 0}
        onDismiss={dismissError}
        action={{ label: '重试', onPress: retry }}
      >
        订单加载失败，下拉重试
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: tokens.color.background,
  },
  tabBar: {
    flexGrow: 0,
    backgroundColor: tokens.color.surface,
  },
  tabs: {
    padding: tokens.space.sm,
    gap: tokens.space.xs,
  },
  list: {
    padding: tokens.space.md,
    gap: tokens.space.md,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    padding: tokens.space.lg,
    gap: tokens.space.md,
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  cardHeader: {
    minHeight: tokens.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space.sm,
  },
  orderNo: {
    flex: 1,
    color: tokens.color.textSecondary,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.disabledFill,
  },
  summaryBody: {
    flex: 1,
    gap: tokens.space.sm,
  },
  meta: {
    color: tokens.color.textSecondary,
  },
  createdAt: {
    color: tokens.color.textTertiary,
  },
  loadingMore: {
    padding: tokens.space.lg,
  },
});
