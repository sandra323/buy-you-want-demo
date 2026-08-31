import type {
  Order as OrderDto,
  OrderItem as OrderItemDto,
} from '@lightbuy/shared';
import { OrderItem } from './order-item.entity';
import { Order } from './order.entity';

export function toOrderItemDto(row: OrderItem): OrderItemDto {
  return {
    productId: row.productId,
    productName: row.productName,
    price: Number(row.price),
    quantity: row.quantity,
    image: row.image,
  };
}

export function toOrderDto(order: Order, items: OrderItem[]): OrderDto {
  const status = order.status as 0 | 1 | 2 | 3 | 4;
  return {
    id: order.id,
    orderNo: order.orderNo,
    status,
    totalAmount: Number(order.totalAmount),
    items: items.map(toOrderItemDto),
    receiverSnapshot: order.receiverSnapshot,
    createdAt: order.createdAt.toISOString(),
  };
}
