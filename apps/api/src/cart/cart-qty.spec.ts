import { ErrorCode } from '@lightbuy/shared';
import { AppException } from '../http/app.exception';
import { assertPurchasableQty, maxPurchasableQty } from './cart-qty';

describe('cart qty rules', () => {
  it('caps at min(99, stock)', () => {
    expect(maxPurchasableQty(5)).toBe(5);
    expect(maxPurchasableQty(200)).toBe(99);
    expect(maxPurchasableQty(0)).toBe(0);
  });

  it('rejects quantity above stock with 40901', () => {
    try {
      assertPurchasableQty(3, 2);
      fail('expected AppException');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).errorCode).toBe(ErrorCode.CONFLICT_STOCK);
    }
  });

  it('rejects quantity outside 1–99 with 40001', () => {
    try {
      assertPurchasableQty(0, 10);
      fail('expected AppException');
    } catch (error) {
      expect((error as AppException).errorCode).toBe(ErrorCode.VALIDATION);
    }
  });
});
