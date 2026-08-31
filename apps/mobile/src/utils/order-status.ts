import type { Order } from '@lightbuy/shared';
import type { OrderStatusFilter } from '../hooks/useOrderPagination';

export const ORDER_STATUS_TABS: {
  value: OrderStatusFilter;
  label: string;
}[] = [
  { value: 'all', label: '全部' },
  { value: 0, label: '待支付' },
  { value: 1, label: '待发货' },
  { value: 4, label: '待收货' },
  { value: 2, label: '已完成' },
  { value: 3, label: '已取消' },
];

export function orderStatusLabel(status: Order['status']): string {
  return ORDER_STATUS_TABS.find((item) => item.value === status)?.label ?? '';
}

export function emptyOrderCopy(status: OrderStatusFilter): string {
  if (status === 'all') {
    return '还没有订单';
  }
  return `暂无${orderStatusLabel(status)}订单`;
}
