import {
  getOrderCompleteAfterSec,
  getOrderJobBatchSize,
  getOrderPayTimeoutSec,
  getOrderShipAfterSec,
} from './order-env';

describe('order-env', () => {
  const originalPay = process.env.ORDER_PAY_TIMEOUT_SEC;
  const originalShip = process.env.ORDER_SHIP_AFTER_SEC;
  const originalAwaiting = process.env.ORDER_AWAITING_RECEIPT_AFTER_SEC;
  const originalComplete = process.env.ORDER_COMPLETE_AFTER_SEC;

  afterEach(() => {
    if (originalPay === undefined) {
      delete process.env.ORDER_PAY_TIMEOUT_SEC;
    } else {
      process.env.ORDER_PAY_TIMEOUT_SEC = originalPay;
    }
    if (originalShip === undefined) {
      delete process.env.ORDER_SHIP_AFTER_SEC;
    } else {
      process.env.ORDER_SHIP_AFTER_SEC = originalShip;
    }
    if (originalAwaiting === undefined) {
      delete process.env.ORDER_AWAITING_RECEIPT_AFTER_SEC;
    } else {
      process.env.ORDER_AWAITING_RECEIPT_AFTER_SEC = originalAwaiting;
    }
    if (originalComplete === undefined) {
      delete process.env.ORDER_COMPLETE_AFTER_SEC;
    } else {
      process.env.ORDER_COMPLETE_AFTER_SEC = originalComplete;
    }
  });

  it('defaults to 60s pay, 180s ship, 300s in transit', () => {
    delete process.env.ORDER_PAY_TIMEOUT_SEC;
    delete process.env.ORDER_SHIP_AFTER_SEC;
    delete process.env.ORDER_AWAITING_RECEIPT_AFTER_SEC;
    delete process.env.ORDER_COMPLETE_AFTER_SEC;
    expect(getOrderPayTimeoutSec()).toBe(60);
    expect(getOrderShipAfterSec()).toBe(180);
    expect(getOrderCompleteAfterSec()).toBe(300);
    expect(getOrderJobBatchSize()).toBe(100);
  });

  it('preserves the legacy paid-to-complete duration', () => {
    process.env.ORDER_SHIP_AFTER_SEC = '180';
    delete process.env.ORDER_AWAITING_RECEIPT_AFTER_SEC;
    process.env.ORDER_COMPLETE_AFTER_SEC = '600';
    expect(getOrderCompleteAfterSec()).toBe(420);
  });

  it('prefers the explicit awaiting-receipt duration', () => {
    process.env.ORDER_SHIP_AFTER_SEC = '180';
    process.env.ORDER_AWAITING_RECEIPT_AFTER_SEC = '300';
    process.env.ORDER_COMPLETE_AFTER_SEC = '600';
    expect(getOrderCompleteAfterSec()).toBe(300);
  });
});
