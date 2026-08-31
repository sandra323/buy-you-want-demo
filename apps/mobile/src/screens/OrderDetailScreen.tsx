import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ErrorCode, type Order } from '@lightbuy/shared';
import { Image } from 'expo-image';
import {
  Button,
  Chip,
  Dialog,
  Divider,
  Portal,
  Text,
} from 'react-native-paper';

import { isApiError } from '../api/errors';
import { cancelOrder, getOrder, payOrder } from '../api/order';
import {
  EmptyState,
  LoginGate,
  PriceText,
  RowListSkeleton,
} from '../components';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/auth';
import { useToastStore } from '../store/toast';
import { tokens } from '../theme';
import { orderStatusLabel } from '../utils/order-status';

type OrderDetailRoute = RouteProp<RootStackParamList, 'OrderDetail'>;
type OrderDetailNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'OrderDetail'
>;

export function OrderDetailScreen() {
  const route = useRoute<OrderDetailRoute>();
  const navigation = useNavigation<OrderDetailNavigation>();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const showToast = useToastStore((state) => state.show);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyAction, setBusyAction] = useState<'pay' | 'cancel' | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setLoadFailed(false);
      try {
        setOrder(await getOrder(route.params.orderId));
      } catch {
        setLoadFailed(true);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [route.params.orderId],
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void load();
      }
      return undefined;
    }, [load, user]),
  );

  async function runAction(action: 'pay' | 'cancel') {
    if (!order || order.status !== 0 || busyAction) {
      return;
    }
    setBusyAction(action);
    try {
      const next =
        action === 'pay'
          ? await payOrder(order.id)
          : await cancelOrder(order.id);
      setOrder(next);
      showToast(action === 'pay' ? '支付成功' : '订单已取消');
    } catch (error) {
      showToast(
        isApiError(error)
          ? error.message
          : action === 'pay'
            ? '支付失败，请重试'
            : '取消失败，请重试',
      );
      if (isApiError(error) && error.code === ErrorCode.CONFLICT_STATE) {
        void load(true);
      }
    } finally {
      setBusyAction(null);
      setShowCancelDialog(false);
    }
  }

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

  if (isLoading && !order) {
    return (
      <View style={styles.page}>
        <RowListSkeleton rows={3} />
      </View>
    );
  }

  if (loadFailed && !order) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="订单加载失败"
          description="订单不存在或网络异常"
          ctaLabel="返回"
          onCtaPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  if (!order) {
    return null;
  }

  const receiver = order.receiverSnapshot;
  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load(true)}
          />
        }
      >
        <View style={styles.section}>
          <View style={styles.header}>
            <Text variant="titleMedium">订单状态</Text>
            <Chip>{orderStatusLabel(order.status)}</Chip>
          </View>
          <Text style={styles.orderNo}>订单号 {order.orderNo}</Text>
          <Text style={styles.orderNo}>
            下单时间 {new Date(order.createdAt).toLocaleString()}
          </Text>
          {order.status === 1 ? (
            <Text style={styles.hint}>订单待发货，约 3 分钟后进入待收货</Text>
          ) : null}
          {order.status === 4 ? (
            <Text style={styles.hint}>订单待收货，约 5 分钟后自动完成</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">收货信息</Text>
          <View style={styles.receiver}>
            <Text variant="titleSmall">
              {receiver.receiverName}　{receiver.phone}
            </Text>
            <Text style={styles.receiverDetail}>
              {receiver.province}
              {receiver.city}
              {receiver.district}
              {receiver.detail}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium">商品快照</Text>
          {order.items.map((item, index) => (
            <View key={`${item.productId}-${index}`}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.productRow}>
                <Image source={{ uri: item.image }} style={styles.image} />
                <View style={styles.productInfo}>
                  <Text numberOfLines={2}>{item.productName}</Text>
                  <PriceText price={item.price} size="sm" />
                </View>
                <Text style={styles.quantity}>×{item.quantity}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.amountRow}>
            <Text variant="titleMedium">实付金额</Text>
            <PriceText price={order.totalAmount} />
          </View>
        </View>
      </ScrollView>
      {order.status === 0 ? (
        <View style={styles.footer}>
          <Button
            mode="outlined"
            textColor={tokens.color.error}
            disabled={busyAction !== null}
            onPress={() => setShowCancelDialog(true)}
            style={styles.action}
            contentStyle={styles.buttonContent}
          >
            取消订单
          </Button>
          <Button
            mode="contained"
            loading={busyAction === 'pay'}
            disabled={busyAction !== null}
            onPress={() => void runAction('pay')}
            style={styles.action}
            contentStyle={styles.buttonContent}
          >
            立即支付
          </Button>
        </View>
      ) : null}
      <Portal>
        <Dialog
          visible={showCancelDialog}
          onDismiss={() => setShowCancelDialog(false)}
        >
          <Dialog.Title>取消订单？</Dialog.Title>
          <Dialog.Content>
            <Text>取消后库存会由服务端恢复，订单无法继续支付。</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCancelDialog(false)}>暂不取消</Button>
            <Button
              textColor={tokens.color.error}
              loading={busyAction === 'cancel'}
              onPress={() => void runAction('cancel')}
            >
              确认取消
            </Button>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNo: {
    color: tokens.color.textSecondary,
  },
  hint: {
    color: tokens.color.success,
  },
  receiver: {
    gap: tokens.space.sm,
  },
  receiverDetail: {
    color: tokens.color.textSecondary,
    lineHeight: 20,
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
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    gap: tokens.space.md,
    padding: tokens.space.md,
    backgroundColor: tokens.color.surface,
  },
  action: {
    flex: 1,
  },
  buttonContent: {
    minHeight: tokens.minTouch,
  },
});
