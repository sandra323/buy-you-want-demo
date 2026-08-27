import { validateBootEnv } from './validate-env';

describe('validateBootEnv', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalSentryDsn = process.env.SENTRY_DSN;
  let exitCode: number | undefined;

  beforeEach(() => {
    exitCode = undefined;
    jest
      .spyOn(process, 'exit')
      .mockImplementation((code?: string | number | null) => {
        exitCode = typeof code === 'number' ? code : 1;
        throw new Error('process.exit called');
      });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
    if (originalSentryDsn === undefined) {
      delete process.env.SENTRY_DSN;
    } else {
      process.env.SENTRY_DSN = originalSentryDsn;
    }
  });

  it('exits non-zero when JWT_SECRET is empty', () => {
    process.env.DATABASE_URL =
      'mysql://lightbuy:lightbuy@localhost:3306/lightbuy';
    process.env.JWT_SECRET = '';

    expect(() => validateBootEnv()).toThrow('process.exit called');
    expect(exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      '[boot] Environment validation failed:',
    );
  });

  it('exits non-zero when JWT_SECRET is shorter than 32 bytes', () => {
    process.env.DATABASE_URL =
      'mysql://lightbuy:lightbuy@localhost:3306/lightbuy';
    process.env.JWT_SECRET = 'too-short';

    expect(() => validateBootEnv()).toThrow('process.exit called');
    expect(exitCode).toBe(1);
  });

  it('passes when required env vars are set even if SENTRY_DSN is unset', () => {
    process.env.DATABASE_URL =
      'mysql://lightbuy:lightbuy@localhost:3306/lightbuy';
    process.env.JWT_SECRET = 'change-me-to-at-least-32-bytes-long-secret';
    delete process.env.SENTRY_DSN;

    expect(() => validateBootEnv()).not.toThrow();
  });
});
