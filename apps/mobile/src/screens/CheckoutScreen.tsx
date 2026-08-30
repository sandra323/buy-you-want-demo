import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ErrorCode,
  type Address,
  type CartData,
  type ProductDetail,
} from '@lightbuy/shared';
import { Image } from 'expo-image';
import {
  Button,
  Dialog,
  Divider,
  Portal,
  RadioButton,
  Text,
} from 'react-native-paper';

import { listAddresses } from '../api/address';
import { getCart } from '../api/cart';
import { getProduct } from '../api/catalog';
import { isApiError } from '../api/errors';
import { createOrder } from '../api/order';
import {
  AddressSummary,
  EmptyState,
  LoginGate,
  PriceText,
  RowListSkeleton,
} from '../components';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth';
import { useCartBadgeStore } from '../store/cart-badge';
import { useToastStore } from '../store/toast';
import { tokens } from '../theme';
import { cartBadgeCount } from '../utils/cart-badge-count';
import { buildCreateOrderRequest } from '../utils/create-order-request';

type CheckoutRoute = RouteProp<RootStackParamList, 'Checkout'>;
type CheckoutNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'Checkout'
>;

export function CheckoutScreen() {
  const route = useRoute<CheckoutRoute>();
  const navigation = useNavigation<CheckoutNavigation>();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const showToast = useToastStore((state) => state.show);
  const setBadgeCount = useCartBadgeStore((state) => state.setCount);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [cart, setCart] = useState<CartData | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockError, setStockError] = useState('');
  const submittingRef = useRef(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const addressPromise = listAddresses();
      const summaryPromise =
        route.params.source === 'cart'
          ? getCart()
          : getProduct(route.params.productId);
      const [nextAddresses, summary] = await Promise.all([
        addressPromise,
        summaryPromise,
      ]);
      setAddresses(nextAddresses);
      setSelectedAddressId((current) => {
        if (nextAddresses.some((address) => address.id === current)) {
          return current;
        }
        return (
          nextAddresses.find((address) => address.isDefault)?.id ??
          nextAddresses[0]?.id ??
          ''
        );
      });
      if (route.params.source === 'cart') {
        const nextCart = summary as CartData;
        setCart(nextCart);
        setProduct(null);
        setBadgeCount(cartBadgeCount(nextCart.items));
      } else {
        setProduct(summary as ProductDetail);
        setCart(null);
      }
    } catch {
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [route.params, setBadgeCount]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void load();
      }
      return undefined;
    }, [load, user]),
  );

  const cartItems = useMemo(
    () =>
      cart?.items.filter(
        (item) => item.selected && !item.invalid && item.stock > 0,
      ) ?? [],
    [cart],
  );
  const canSubmit =
    Boolean(selectedAddressId) &&
    (route.params.source === 'cart'
      ? cartItems.length > 0
      : Boolean(product && product.status === 1 && product.stock > 0));

  async function submit() {
    if (!canSubmit || submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const order = await createOrder(
        buildCreateOrderRequest(selectedAddressId, route.params),
      );
      if (route.params.source === 'cart') {
        void getCart()
          .then((nextCart) => setBadgeCount(cartBadgeCount(nextCart.items)))
          .catch(() => undefined);
      }
      navigation.replace('OrderDetail', { orderId: order.id });
    } catch (error) {
      if (isApiError(error) && error.code === ErrorCode.CONFLICT_STOCK) {
        setStockError(error.message);
      } else {
        showToast(isApiError(error) ? error.message : '下单失败，请重试');
      }
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  }

  if (isHydrating) {
    return <View style={styles.page} />;
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <LoginGate title="登录后结算" description="登录后才能提交订单" />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.page}>
        <RowListSkeleton rows={3} />
      </View>
    );
  }

  if (loadFailed) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="结算信息加载失败"
          description="请检查网络后重试"
          ctaLabel="重试"
          onCtaPress={() => void load()}
        />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium">收货地址</Text>
            {addresses.length > 0 ? (
              <Button
                compact
                onPress={() => navigation.navigate('AddressList')}
              >
                管理
              </Button>
            ) : null}
          </View>
          {addresses.length === 0 ? (
            <EmptyState
              title="还没有收货地址"
              description="请先新增地址再提交订单"
              illustration={
                <MaterialCommunityIcons
                  name="map-marker-plus-outline"
                  size={56}
                  color={tokens.color.textTertiary}
                />
              }
              ctaLabel="新增地址"
              onCtaPress={() => navigation.navigate('AddressEdit', {})}
            />
          ) : (
            <RadioButton.Group
              value={selectedAddressId}
              onValueChange={setSelectedAddressId}
            >
              {addresses.map((address, index) => (
                <View key={address.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={styles.addressRow}>
                    <RadioButton value={address.id} />
                    <AddressSummary address={address} />
                    {address.isDefault ? (
                      <Text style={styles.defaultText}>默认</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </RadioButton.Group>
          )}
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">商品清单</Text>
          {route.params.source === 'cart'
            ? cartItems.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <Divider /> : null}
                  <View style={styles.productRow}>
                    <Image source={{ uri: item.image }} style={styles.image} />
                    <View style={styles.productInfo}>
                      <Text numberOfLines={2}>{item.name}</Text>
                      <PriceText price={item.price} size="sm" />
                    </View>
                    <Text style={styles.quantity}>×{item.quantity}</Text>
                  </View>
                </View>
              ))
            : product && (
                <View style={styles.productRow}>
                  <Image
                    source={{ uri: product.mainImage }}
                    style={styles.image}
                  />
                  <View style={styles.productInfo}>
                    <Text numberOfLines={2}>{product.name}</Text>
                    <PriceText price={product.price} size="sm" />
                  </View>
                  <Text style={styles.quantity}>×{route.params.quantity}</Text>
                </View>
              )}
          {route.params.source === 'cart' && cartItems.length === 0 ? (
            <Text style={styles.warning}>购物车没有可结算的已选商品</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">金额</Text>
          {route.params.source === 'cart' && cart ? (
            <View style={styles.amountRow}>
              <Text>应付金额</Text>
              <PriceText price={cart.selectedAmount} />
            </View>
          ) : (
            <Text style={styles.amountHint}>
              最终金额以下单后的服务端计价为准
            </Text>
          )}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          mode="contained"
          loading={isSubmitting}
          disabled={!canSubmit || isSubmitting}
          onPress={() => void submit()}
          contentStyle={styles.buttonContent}
        >
          提交订单
        </Button>
      </View>
      <Portal>
        <Dialog
          visible={Boolean(stockError)}
          onDismiss={() => setStockError('')}
        >
          <Dialog.Title>库存不足</Dialog.Title>
          <Dialog.Content>
            <Text>{stockError}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStockError('')}>知道了</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  content: {
    padding: tokens.space.md,
    gap: tokens.space.md,
  },
  section: {
    padding: tokens.space.lg,
    gap: tokens.space.md,
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressRow: {
    minHeight: tokens.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.space.md,
  },
  defaultText: {
    color: tokens.color.primary,
  },
  productRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    paddingVertical: tokens.space.md,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.disabledFill,
  },
  productInfo: {
    flex: 1,
    gap: tokens.space.sm,
  },
  quantity: {
    color: tokens.color.textSecondary,
  },
  warning: {
    color: tokens.color.error,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountHint: {
    color: tokens.color.textSecondary,
  },
  footer: {
    padding: tokens.space.md,
    backgroundColor: tokens.color.surface,
  },
  buttonContent: {
    minHeight: tokens.minTouch,
  },
});
