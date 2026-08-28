import {
  getOrderCompleteAfterSec,
  getOrderJobBatchSize,
  getOrderPayTimeoutSec,
} from './order-env';

describe('order-env', () => {
  const originalPay = process.env.ORDER_PAY_TIMEOUT_SEC;
  const originalComplete = process.env.ORDER_COMPLETE_AFTER_SEC;

  afterEach(() => {
    if (originalPay === undefined) {
      delete process.env.ORDER_PAY_TIMEOUT_SEC;
    } else {
      process.env.ORDER_PAY_TIMEOUT_SEC = originalPay;
    }
    if (originalComplete === undefined) {
      delete process.env.ORDER_COMPLETE_AFTER_SEC;
    } else {
      process.env.ORDER_COMPLETE_AFTER_SEC = originalComplete;
    }
  });

  it('defaults to 60s pay timeout and 600s complete', () => {
    delete process.env.ORDER_PAY_TIMEOUT_SEC;
    delete process.env.ORDER_COMPLETE_AFTER_SEC;
    expect(getOrderPayTimeoutSec()).toBe(60);
    expect(getOrderCompleteAfterSec()).toBe(600);
    expect(getOrderJobBatchSize()).toBe(100);
  });
});
