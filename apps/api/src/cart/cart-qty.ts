import { ErrorCode } from '@lightbuy/shared';
import { AppException } from '../http/app.exception';

export const CART_MAX_QUANTITY = 99;

/** 在售商品数量上限是 99 与当前库存的较小值。 */
export function maxPurchasableQty(stock: number): number {
  return Math.min(CART_MAX_QUANTITY, Math.max(0, stock));
}

export function assertPurchasableQty(quantity: number, stock: number): void {
  if (quantity < 1 || quantity > CART_MAX_QUANTITY) {
    throw new AppException(ErrorCode.VALIDATION);
  }
  if (quantity > stock) {
    throw new AppException(ErrorCode.CONFLICT_STOCK);
  }
}
