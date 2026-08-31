import { OrderJobs } from './order-jobs';
import { OrdersService } from './orders.service';

describe('OrderJobs', () => {
  const findExpiredPendingIds = jest.fn();
  const findDueShipIds = jest.fn();
  const findDueCompleteIds = jest.fn();
  const cancelPendingById = jest.fn();
  const markAwaitingReceiptById = jest.fn();
  const completePaidById = jest.fn();
  const originalPay = process.env.ORDER_PAY_TIMEOUT_SEC;
  const originalShip = process.env.ORDER_SHIP_AFTER_SEC;
  const originalAwaiting = process.env.ORDER_AWAITING_RECEIPT_AFTER_SEC;
  const originalComplete = process.env.ORDER_COMPLETE_AFTER_SEC;
  let jobs: OrderJobs;

  beforeEach(() => {
    process.env.ORDER_PAY_TIMEOUT_SEC = '60';
    process.env.ORDER_SHIP_AFTER_SEC = '180';
    process.env.ORDER_AWAITING_RECEIPT_AFTER_SEC = '300';
    delete process.env.ORDER_COMPLETE_AFTER_SEC;
    findExpiredPendingIds.mockReset();
    findDueShipIds.mockReset();
    findDueCompleteIds.mockReset();
    cancelPendingById.mockReset();
    markAwaitingReceiptById.mockReset();
    completePaidById.mockReset();
    jobs = new OrderJobs({
      findExpiredPendingIds,
      findDueShipIds,
      findDueCompleteIds,
      cancelPendingById,
      markAwaitingReceiptById,
      completePaidById,
    } as unknown as OrdersService);
  });

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

  it('cancels unpaid, ships paid, then completes awaiting receipt', async () => {
    findExpiredPendingIds.mockResolvedValueOnce(['o1']).mockResolvedValue([]);
    findDueShipIds.mockResolvedValueOnce(['o2']).mockResolvedValue([]);
    findDueCompleteIds.mockResolvedValueOnce(['o3']).mockResolvedValue([]);
    cancelPendingById.mockResolvedValue(true);
    markAwaitingReceiptById.mockResolvedValue(true);
    completePaidById.mockResolvedValue(true);

    const now = new Date('2026-01-01T00:02:00.000Z');
    await jobs.tick(now);

    expect(findExpiredPendingIds).toHaveBeenCalledWith(
      new Date('2026-01-01T00:01:00.000Z'),
      100,
    );
    expect(cancelPendingById).toHaveBeenCalledWith('o1', now);
    expect(findDueShipIds).toHaveBeenCalledWith(
      new Date('2025-12-31T23:59:00.000Z'),
      100,
    );
    expect(markAwaitingReceiptById).toHaveBeenCalledWith('o2', now);
    expect(findDueCompleteIds).toHaveBeenCalledWith(
      new Date('2025-12-31T23:57:00.000Z'),
      100,
    );
    expect(completePaidById).toHaveBeenCalledWith('o3', now);
  });

  it('skips cron in test env so e2e can inject tick(now)', async () => {
    const tick = jest.spyOn(jobs, 'tick').mockResolvedValue(undefined);
    await jobs.handleCron();
    expect(tick).not.toHaveBeenCalled();
    tick.mockRestore();
  });
});
