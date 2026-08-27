const DEFAULT_TTL_SEC = 60;
const DEFAULT_LIMIT = 10;

/** `.env` 里 `THROTTLE_TTL` 是秒；Nest throttler v6 要毫秒。 */
export function getThrottleTtlMs(): number {
  const sec = Number(process.env.THROTTLE_TTL);
  const ttlSec = Number.isFinite(sec) && sec > 0 ? sec : DEFAULT_TTL_SEC;
  return ttlSec * 1000;
}

export function getThrottleLimit(): number {
  const limit = Number(process.env.THROTTLE_LIMIT);
  return Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT;
}
