const DEFAULT_PAY_TIMEOUT_SEC = 60;
const DEFAULT_SHIP_AFTER_SEC = 180;
const DEFAULT_COMPLETE_AFTER_SEC = 300;
const JOB_BATCH_SIZE = 100;

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getOrderPayTimeoutSec(): number {
  return positiveInt(
    process.env.ORDER_PAY_TIMEOUT_SEC,
    DEFAULT_PAY_TIMEOUT_SEC,
  );
}

export function getOrderShipAfterSec(): number {
  return positiveInt(process.env.ORDER_SHIP_AFTER_SEC, DEFAULT_SHIP_AFTER_SEC);
}

/** Seconds in 待收货 before auto-complete. */
export function getOrderCompleteAfterSec(): number {
  if (process.env.ORDER_AWAITING_RECEIPT_AFTER_SEC !== undefined) {
    return positiveInt(
      process.env.ORDER_AWAITING_RECEIPT_AFTER_SEC,
      DEFAULT_COMPLETE_AFTER_SEC,
    );
  }
  if (process.env.ORDER_COMPLETE_AFTER_SEC !== undefined) {
    const legacyPaidToComplete = positiveInt(
      process.env.ORDER_COMPLETE_AFTER_SEC,
      getOrderShipAfterSec() + DEFAULT_COMPLETE_AFTER_SEC,
    );
    return Math.max(1, legacyPaidToComplete - getOrderShipAfterSec());
  }
  return DEFAULT_COMPLETE_AFTER_SEC;
}

export function getOrderJobBatchSize(): number {
  return JOB_BATCH_SIZE;
}
