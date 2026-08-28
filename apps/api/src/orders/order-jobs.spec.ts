import { OrderJobs } from './order-jobs';
import { OrdersService } from './orders.service';

describe('OrderJobs', () => {
  const findExpiredPendingIds = jest.fn();
  const findDueCompleteIds = jest.fn();
  const cancelPendingById = jest.fn();
  const completePaidById = jest.fn();
  const originalPay = process.env.ORDER_PAY_TIMEOUT_SEC;
  const originalComplete = process.env.ORDER_COMPLETE_AFTER_SEC;
  let jobs: OrderJobs;

  beforeEach(() => {
    process.env.ORDER_PAY_TIMEOUT_SEC = '60';
    process.env.ORDER_COMPLETE_AFTER_SEC = '600';
    findExpiredPendingIds.mockReset();
    findDueCompleteIds.mockReset();
    cancelPendingById.mockReset();
    completePaidById.mockReset();
    jobs = new OrderJobs({
      findExpiredPendingIds,
      findDueCompleteIds,
      cancelPendingById,
      completePaidById,
    } as unknown as OrdersService);
  });

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

  it('cancels unpaid past timeout and completes paid past the complete delay', async () => {
    findExpiredPendingIds.mockResolvedValueOnce(['o1']).mockResolvedValue([]);
    findDueCompleteIds.mockResolvedValueOnce(['o2']).mockResolvedValue([]);
    cancelPendingById.mockResolvedValue(true);
    completePaidById.mockResolvedValue(true);

    const now = new Date('2026-01-01T00:02:00.000Z');
    await jobs.tick(now);

    expect(findExpiredPendingIds).toHaveBeenCalledWith(
      new Date('2026-01-01T00:01:00.000Z'),
      100,
    );
    expect(cancelPendingById).toHaveBeenCalledWith('o1', now);
    expect(findDueCompleteIds).toHaveBeenCalledWith(
      new Date('2025-12-31T23:52:00.000Z'),
      100,
    );
    expect(completePaidById).toHaveBeenCalledWith('o2', now);
  });

  it('skips cron in test env so e2e can inject tick(now)', async () => {
    const tick = jest.spyOn(jobs, 'tick').mockResolvedValue(undefined);
    await jobs.handleCron();
    expect(tick).not.toHaveBeenCalled();
    tick.mockRestore();
  });
});
