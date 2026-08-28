const DEFAULT_PAY_TIMEOUT_SEC = 60;
const DEFAULT_COMPLETE_AFTER_SEC = 600;
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

export function getOrderCompleteAfterSec(): number {
  return positiveInt(
    process.env.ORDER_COMPLETE_AFTER_SEC,
    DEFAULT_COMPLETE_AFTER_SEC,
  );
}

export function getOrderJobBatchSize(): number {
  return JOB_BATCH_SIZE;
}
