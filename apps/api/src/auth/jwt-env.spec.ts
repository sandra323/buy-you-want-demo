import { parseDurationToMs, getJwtRefreshTtlMs } from './jwt-env';

describe('jwt-env refresh TTL', () => {
  const original = process.env.JWT_REFRESH_TTL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.JWT_REFRESH_TTL;
    } else {
      process.env.JWT_REFRESH_TTL = original;
    }
  });

  it('parses 30d and 30m', () => {
    expect(parseDurationToMs('30d')).toBe(30 * 24 * 60 * 60 * 1000);
    expect(parseDurationToMs('30m')).toBe(30 * 60 * 1000);
  });

  it('defaults JWT_REFRESH_TTL to 30d', () => {
    delete process.env.JWT_REFRESH_TTL;
    expect(getJwtRefreshTtlMs()).toBe(parseDurationToMs('30d'));
  });
});
