import type { ReceiverSnapshot } from './address';
import type { PaginationQuery } from './pagination';

export interface OrderLineItemInput {
  productId: string;
  quantity: number;
}

/** Create order: exactly one of `fromCart: true` or `items`. */
export type CreateOrderRequest =
  | { addressId: string; fromCart: true; items?: never }
  | { addressId: string; fromCart?: false; items: OrderLineItemInput[] };

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image: string;
}

/** Order status: 0 pending_pay, 1 paid/to-ship, 4 awaiting receipt, 2 completed, 3 cancelled. */
export interface Order {
  id: string;
  orderNo: string;
  status: 0 | 1 | 2 | 3 | 4;
  totalAmount: number;
  items: OrderItem[];
  receiverSnapshot: ReceiverSnapshot;
  createdAt: string;
}

export interface OrderListQuery extends PaginationQuery {
  /** Omit or `all` for all; otherwise `0|1|2|3|4`. */
  status?: 0 | 1 | 2 | 3 | 4 | 'all';
}
