import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ErrorCode, type ProductDetail } from '@lightbuy/shared';
import { Image } from 'expo-image';
import { Button, Snackbar, Text } from 'react-native-paper';

import {
  trackAddToCartSucceeded,
  trackClick,
  trackProductViewed,
} from '../analytics';
import { addCartItem } from '../api/cart';
import { getProduct } from '../api/catalog';
import { isApiError } from '../api/errors';
import { EmptyState, PriceText, QtyStepper } from '../components';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth';
import { useCartBadgeStore } from '../store/cart-badge';
import {
  type ScreenPoint,
  useCartAnimationStore,
} from '../store/cart-animation';
import {
  type PendingAction,
  usePendingActionStore,
} from '../store/pending-action';
import { decidePendingRetryOnFocus } from './pending-retry';
import { tokens } from '../theme';
import { cartBadgeCount } from '../utils/cart-badge-count';

type DetailRoute = RouteProp<RootStackParamList, 'ProductDetail'>;
type DetailNavigation = NativeStackNavigationProp<RootStackParamList>;

export function ProductDetailScreen() {
  const navigation = useNavigation<DetailNavigation>();
  const route = useRoute<DetailRoute>();
  const { width } = useWindowDimensions();
  const { productId } = route.params;
  const user = useAuthStore((state) => state.user);
  const setPendingAction = usePendingActionStore(
    (state) => state.setPendingAction,
  );
  const clearPendingAction = usePendingActionStore(
    (state) => state.clearPendingAction,
  );
  const setCartBadge = useCartBadgeStore((state) => state.setCount);
  const notifyAddSuccess = useCartAnimationStore(
    (state) => state.notifyAddSuccess,
  );

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const requestIdRef = useRef(0);
  const actionInFlightRef = useRef(false);
  const awaitingLoginRef = useRef(false);
  const viewedProductRef = useRef<string | null>(null);
  const addButtonRef = useRef<View>(null);
  const addButtonPointRef = useRef<ScreenPoint | null>(null);

  const measureAddButton = useCallback(() => {
    requestAnimationFrame(() => {
      addButtonRef.current?.measureInWindow((x, y, width, height) => {
        addButtonPointRef.current = {
          x: x + width / 2,
          y: y + height / 2,
        };
      });
    });
  }, []);

  const loadProduct = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(false);
    setIsNotFound(false);
    try {
      const data = await getProduct(productId);
      if (requestId !== requestIdRef.current) {
        return;
      }
      if (data.status === 0) {
        setProduct(null);
        setIsNotFound(true);
        return;
      }
      setProduct(data);
      setQuantity(1);
      if (viewedProductRef.current !== productId) {
        trackProductViewed(productId, route.params.from ?? 'unknown');
        viewedProductRef.current = productId;
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setProduct(null);
      if (isApiError(error) && error.code === ErrorCode.NOT_FOUND) {
        setIsNotFound(true);
      } else {
        setLoadError(true);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [productId, route.params.from]);

  useEffect(() => {
    void loadProduct();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadProduct]);

  const executePendingAction = useCallback(
    async (action: PendingAction) => {
      if (
        action.productId !== productId ||
        actionInFlightRef.current ||
        !useAuthStore.getState().user
      ) {
        return;
      }

      actionInFlightRef.current = true;
      try {
        if (action.type === 'add_to_cart') {
          setIsAdding(true);
          const cart = await addCartItem({
            productId: action.productId,
            quantity: action.quantity,
          });
          setCartBadge(cartBadgeCount(cart.items));
          notifyAddSuccess(addButtonPointRef.current);
          setSnackbarMessage('已加入购物车');
          trackAddToCartSucceeded(action.productId, action.quantity);
        } else {
          navigation.navigate('Checkout', {
            source: 'buyNow',
            productId: action.productId,
            quantity: action.quantity,
          });
        }
        // 失败时保留 pending，已登录用户可再点一次；成功或进结算后再清。
        clearPendingAction();
      } catch (error) {
        setSnackbarMessage(
          isApiError(error) ? error.message : '操作失败，请稍后重试',
        );
      } finally {
        setIsAdding(false);
        actionInFlightRef.current = false;
      }
    },
    [clearPendingAction, navigation, notifyAddSuccess, productId, setCartBadge],
  );

  useFocusEffect(
    useCallback(() => {
      const action = usePendingActionStore.getState().pendingAction;
      const decision = decidePendingRetryOnFocus({
        pending: action,
        productId,
        awaitingLogin: awaitingLoginRef.current,
        isLoggedIn: Boolean(useAuthStore.getState().user),
      });
      if (decision === 'ignore' || !action) {
        return;
      }
      awaitingLoginRef.current = false;
      if (decision === 'execute') {
        void executePendingAction(action);
      } else {
        clearPendingAction();
      }
    }, [clearPendingAction, executePendingAction, productId]),
  );

  const beginAction = useCallback(
    (type: PendingAction['type']) => {
      if (!product || product.stock === 0 || isAdding) {
        return;
      }
      trackClick(
        'product_detail',
        type === 'add_to_cart' ? 'add_to_cart' : 'buy_now',
      );
      const action: PendingAction = { type, productId, quantity };
      // 已登录直接执行，避免 setPending 后再被 effect 跑第二次（立即购买会叠两个结算页）。
      if (!user) {
        setPendingAction(action);
        awaitingLoginRef.current = true;
        navigation.navigate('Login');
        return;
      }
      void executePendingAction(action);
    },
    [
      executePendingAction,
      isAdding,
      navigation,
      product,
      productId,
      quantity,
      setPendingAction,
      user,
    ],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.color.primary} size="large" />
        <Text style={styles.secondary}>正在加载商品</Text>
      </View>
    );
  }

  if (isNotFound) {
    return (
      <EmptyState
        title="商品不存在"
        description="商品可能已下架或被删除"
        illustration={
          <MaterialCommunityIcons
            name="package-variant-closed"
            size={64}
            color={tokens.color.textTertiary}
          />
        }
        ctaLabel="返回"
        onCtaPress={() => navigation.goBack()}
      />
    );
  }

  if (loadError || !product) {
    return (
      <EmptyState
        title="商品加载失败"
        description="请检查网络后重试"
        illustration={
          <MaterialCommunityIcons
            name="wifi-alert"
            size={64}
            color={tokens.color.textTertiary}
          />
        }
        ctaLabel="重试"
        onCtaPress={() => void loadProduct()}
      />
    );
  }

  const gallery =
    product.images.length > 0 ? product.images : [product.mainImage];
  const soldOut = product.stock === 0;

  return (
    <View style={styles.page}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.gallery}
        >
          {gallery.map((uri, index) => (
            <Image
              key={`${uri}-${index}`}
              source={{ uri }}
              style={{ width, height: width }}
              contentFit="cover"
              transition={200}
            />
          ))}
        </ScrollView>

        <View style={styles.section}>
          <PriceText
            price={product.price}
            originalPrice={product.originalPrice}
          />
          <Text variant="titleLarge" style={styles.name}>
            {product.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.secondary}>已售 {product.sales}</Text>
            <Text style={soldOut ? styles.soldOut : styles.secondary}>
              {soldOut ? '暂时缺货' : `库存 ${product.stock}`}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">购买数量</Text>
          <QtyStepper
            value={quantity}
            max={product.stock}
            onChange={setQuantity}
          />
          {soldOut ? (
            <Text style={styles.soldOut}>该商品库存为 0，暂时无法购买</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">商品详情</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <View
          ref={addButtonRef}
          collapsable={false}
          onLayout={measureAddButton}
          style={styles.action}
        >
          <Button
            mode="outlined"
            disabled={soldOut || isAdding}
            loading={isAdding}
            onPress={() => beginAction('add_to_cart')}
            style={styles.actionButton}
            contentStyle={styles.actionContent}
          >
            加入购物车
          </Button>
        </View>
        <Button
          mode="contained"
          disabled={soldOut || isAdding}
          onPress={() => beginAction('buy_now')}
          style={styles.action}
          contentStyle={styles.actionContent}
        >
          立即购买
        </Button>
      </View>

      <Snackbar
        visible={Boolean(snackbarMessage)}
        onDismiss={() => setSnackbarMessage('')}
      >
        {snackbarMessage}
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
    paddingBottom: tokens.space.lg,
    gap: tokens.space.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.md,
    backgroundColor: tokens.color.background,
  },
  gallery: {
    backgroundColor: tokens.color.surface,
  },
  section: {
    padding: tokens.space.lg,
    gap: tokens.space.md,
    backgroundColor: tokens.color.surface,
  },
  name: {
    color: tokens.color.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondary: {
    color: tokens.color.textSecondary,
  },
  soldOut: {
    color: tokens.color.error,
  },
  description: {
    color: tokens.color.textSecondary,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: tokens.space.md,
    padding: tokens.space.md,
    backgroundColor: tokens.color.surface,
  },
  action: {
    flex: 1,
  },
  actionButton: {
    borderRadius: tokens.radius.input,
  },
  actionContent: {
    minHeight: tokens.minTouch,
  },
});
