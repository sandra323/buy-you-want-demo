import { getThrottleLimit, getThrottleTtlMs } from './throttle-env';

describe('throttle-env', () => {
  const originalTtl = process.env.THROTTLE_TTL;
  const originalLimit = process.env.THROTTLE_LIMIT;

  afterEach(() => {
    if (originalTtl === undefined) {
      delete process.env.THROTTLE_TTL;
    } else {
      process.env.THROTTLE_TTL = originalTtl;
    }
    if (originalLimit === undefined) {
      delete process.env.THROTTLE_LIMIT;
    } else {
      process.env.THROTTLE_LIMIT = originalLimit;
    }
  });

  it('defaults to 10 requests per 60s', () => {
    delete process.env.THROTTLE_TTL;
    delete process.env.THROTTLE_LIMIT;
    expect(getThrottleTtlMs()).toBe(60_000);
    expect(getThrottleLimit()).toBe(10);
  });

  it('reads seconds from THROTTLE_TTL', () => {
    process.env.THROTTLE_TTL = '60';
    process.env.THROTTLE_LIMIT = '2';
    expect(getThrottleTtlMs()).toBe(60_000);
    expect(getThrottleLimit()).toBe(2);
  });
});
