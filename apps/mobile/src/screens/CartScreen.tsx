import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { CartData, CartItem } from '@lightbuy/shared';
import { Image } from 'expo-image';
import { Button, Checkbox, Text } from 'react-native-paper';

import { getCart, removeCartItem, updateCartItem } from '../api/cart';
import { isApiError } from '../api/errors';
import {
  EmptyState,
  LoginGate,
  PriceText,
  QtyStepper,
  RowListSkeleton,
} from '../components';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth';
import { useCartBadgeStore } from '../store/cart-badge';
import { useToastStore } from '../store/toast';
import { tokens } from '../theme';
import { cartBadgeCount } from '../utils/cart-badge-count';

type CartNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Cart'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function CartScreen() {
  const navigation = useNavigation<CartNavigation>();
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const setBadgeCount = useCartBadgeStore((s) => s.setCount);
  const showToast = useToastStore((s) => s.show);
  const [cart, setCart] = useState<CartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const applyCart = useCallback(
    (data: CartData) => {
      setCart(data);
      setBadgeCount(cartBadgeCount(data.items));
    },
    [setBadgeCount],
  );

  const loadCart = useCallback(async () => {
    setLoadFailed(false);
    try {
      applyCart(await getCart());
    } catch {
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [applyCart]);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        return undefined;
      }
      setIsLoading(true);
      void loadCart();
      return undefined;
    }, [loadCart, user]),
  );

  const validItems = useMemo(
    () => cart?.items.filter((item) => !item.invalid && item.stock > 0) ?? [],
    [cart],
  );
  const allSelected =
    validItems.length > 0 && validItems.every((item) => item.selected);
  const hasSelected = validItems.some((item) => item.selected);

  const setBusy = useCallback((ids: string[], busy: boolean) => {
    setBusyIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => (busy ? next.add(id) : next.delete(id)));
      return next;
    });
  }, []);

  const changeItem = useCallback(
    async (item: CartItem, body: { quantity?: number; selected?: boolean }) => {
      setBusy([item.id], true);
      try {
        applyCart(await updateCartItem(item.id, body));
      } catch (error) {
        showToast(isApiError(error) ? error.message : '购物车更新失败，请重试');
      } finally {
        setBusy([item.id], false);
      }
    },
    [applyCart, setBusy, showToast],
  );

  const deleteItem = useCallback(
    async (item: CartItem) => {
      setBusy([item.id], true);
      try {
        applyCart(await removeCartItem(item.id));
      } catch (error) {
        showToast(isApiError(error) ? error.message : '删除失败，请重试');
      } finally {
        setBusy([item.id], false);
      }
    },
    [applyCart, setBusy, showToast],
  );

  const toggleAll = useCallback(async () => {
    const changed = validItems.filter((item) => item.selected === allSelected);
    if (changed.length === 0) {
      return;
    }
    setBusy(
      changed.map((item) => item.id),
      true,
    );
    const results = await Promise.allSettled(
      changed.map((item) =>
        updateCartItem(item.id, { selected: !allSelected }),
      ),
    );
    try {
      applyCart(await getCart());
    } catch {
      showToast('购物车对账失败，请下拉后重试');
    } finally {
      setBusy(
        changed.map((item) => item.id),
        false,
      );
    }
    const failed = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failed) {
      showToast(
        isApiError(failed.reason)
          ? failed.reason.message
          : '部分商品更新失败，请重试',
      );
    }
  }, [allSelected, applyCart, setBusy, showToast, validItems]);

  if (isHydrating) {
    return <View style={styles.page} />;
  }

  if (!user) {
    return (
      <View style={styles.page}>
        <LoginGate
          title="登录后查看购物车"
          description="游客购物车不同步，登录后即可管理商品"
          ctaLabel="去登录"
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.page}>
        <RowListSkeleton />
      </View>
    );
  }

  if (loadFailed && !cart) {
    return (
      <View style={styles.page}>
        <EmptyState
          title="购物车加载失败"
          description="请检查网络后重试"
          illustration={
            <MaterialCommunityIcons
              name="cart-off"
              size={64}
              color={tokens.color.textTertiary}
            />
          }
          ctaLabel="重试"
          onCtaPress={() => {
            setIsLoading(true);
            void loadCart();
          }}
        />
      </View>
    );
  }

  const renderItem = ({ item }: { item: CartItem }) => {
    const invalid = item.invalid || item.stock === 0;
    const busy = busyIds.has(item.id);
    return (
      <View style={[styles.card, invalid && styles.invalidCard]}>
        <Checkbox
          status={item.selected && !invalid ? 'checked' : 'unchecked'}
          disabled={invalid || busy}
          onPress={() => void changeItem(item, { selected: !item.selected })}
        />
        <Pressable
          disabled={invalid}
          onPress={() =>
            navigation.navigate('ProductDetail', {
              productId: item.productId,
            })
          }
          style={styles.product}
        >
          <Image source={{ uri: item.image }} style={styles.image} />
          <View style={styles.info}>
            <Text
              variant="titleSmall"
              numberOfLines={2}
              style={invalid ? styles.invalidText : styles.name}
            >
              {item.name || '商品已失效'}
            </Text>
            <PriceText price={item.price} size="sm" />
            {invalid ? (
              <Text style={styles.invalidText}>商品已下架或无库存</Text>
            ) : (
              <Text style={styles.stock}>库存 {item.stock}</Text>
            )}
          </View>
        </Pressable>
        <View style={styles.controls}>
          <QtyStepper
            value={item.quantity}
            max={Math.min(99, item.stock)}
            disabled={invalid || busy}
            onChange={(quantity) => void changeItem(item, { quantity })}
          />
          <Button
            compact
            textColor={tokens.color.error}
            disabled={busy}
            onPress={() => void deleteItem(item)}
          >
            删除
          </Button>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.page}>
      <FlatList
        data={cart?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          (cart?.items.length ?? 0) === 0 && styles.emptyList,
        ]}
        refreshing={isLoading}
        onRefresh={() => void loadCart()}
        ListEmptyComponent={
          <EmptyState
            title="购物车还是空的"
            description="去首页挑选你想要的商品"
            illustration={
              <MaterialCommunityIcons
                name="cart-outline"
                size={64}
                color={tokens.color.textTertiary}
              />
            }
            ctaLabel="去逛逛"
            onCtaPress={() => navigation.navigate('Home')}
          />
        }
      />
      {(cart?.items.length ?? 0) > 0 ? (
        <View style={styles.checkoutBar}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allSelected }}
            onPress={() => void toggleAll()}
            style={styles.selectAll}
          >
            <Checkbox status={allSelected ? 'checked' : 'unchecked'} />
            <Text>全选</Text>
          </Pressable>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>合计</Text>
            <PriceText price={cart?.selectedAmount ?? 0} />
          </View>
          <Button
            mode="contained"
            disabled={!hasSelected || busyIds.size > 0}
            onPress={() => navigation.navigate('Checkout', { source: 'cart' })}
            contentStyle={styles.checkoutContent}
          >
            去结算
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
    justifyContent: 'center',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space.sm,
    padding: tokens.space.md,
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.surface,
  },
  invalidCard: {
    opacity: 0.58,
  },
  product: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    gap: tokens.space.md,
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.disabledFill,
  },
  info: {
    flex: 1,
    gap: tokens.space.xs,
  },
  name: {
    color: tokens.color.textPrimary,
  },
  stock: {
    color: tokens.color.textSecondary,
  },
  invalidText: {
    color: tokens.color.textTertiary,
  },
  controls: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: tokens.space.md,
  },
  checkoutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    padding: tokens.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.color.line,
    backgroundColor: tokens.color.surface,
  },
  selectAll: {
    minHeight: tokens.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
  },
  total: {
    flex: 1,
    alignItems: 'flex-end',
  },
  totalLabel: {
    color: tokens.color.textSecondary,
  },
  checkoutContent: {
    minHeight: tokens.minTouch,
  },
});
