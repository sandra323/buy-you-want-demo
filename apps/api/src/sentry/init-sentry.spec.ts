import {
  buildSentryInitOptions,
  resolveSentryDsn,
  stripSentryPii,
} from './sentry-options';
import { initSentry } from './init-sentry';
import type { ErrorEvent } from '@sentry/nestjs';

describe('Sentry init from env', () => {
  const originalDsn = process.env.SENTRY_DSN;
  const originalRelease = process.env.SENTRY_RELEASE;

  afterEach(() => {
    if (originalDsn === undefined) {
      delete process.env.SENTRY_DSN;
    } else {
      process.env.SENTRY_DSN = originalDsn;
    }
    if (originalRelease === undefined) {
      delete process.env.SENTRY_RELEASE;
    } else {
      process.env.SENTRY_RELEASE = originalRelease;
    }
  });

  it('does not init when SENTRY_DSN is unset', () => {
    const init = jest.fn();
    expect(initSentry({ ...process.env, SENTRY_DSN: undefined }, init)).toBe(
      false,
    );
    expect(init).not.toHaveBeenCalled();
    expect(buildSentryInitOptions({ SENTRY_DSN: undefined })).toBeUndefined();
  });

  it('does not init when SENTRY_DSN is empty or whitespace', () => {
    const init = jest.fn();
    expect(resolveSentryDsn({ SENTRY_DSN: '' })).toBeUndefined();
    expect(resolveSentryDsn({ SENTRY_DSN: '   ' })).toBeUndefined();
    expect(initSentry({ SENTRY_DSN: ' \t\n ' }, init)).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it('inits with DSN, release, and sendDefaultPii false', () => {
    const init = jest.fn();
    const dsn = 'https://public@127.0.0.1/1';
    const enabled = initSentry(
      { SENTRY_DSN: `  ${dsn}  `, SENTRY_RELEASE: '  1.0.0+1  ' },
      init,
    );

    expect(enabled).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn,
        release: '1.0.0+1',
        sendDefaultPii: false,
      }),
    );
  });

  it('strips Authorization and cookies and drops extras (no PII/tokens)', () => {
    const event = {
      request: {
        headers: {
          authorization: 'Bearer secret-token',
          Authorization: 'Bearer other',
          cookie: 'sid=abc',
          'content-type': 'application/json',
        },
        cookies: { sid: 'abc' },
      },
      user: {
        email: 'user@example.com',
        ip_address: '127.0.0.1',
        username: '13800000000',
        id: 'user-1',
      },
      extra: { accessToken: 'jwt-should-not-ship', phone: '13800000000' },
    } as unknown as ErrorEvent;

    const cleaned = stripSentryPii(event);
    expect(cleaned).toBe(event);
    expect(cleaned?.request?.headers).toEqual({
      'content-type': 'application/json',
    });
    expect(cleaned?.request?.cookies).toBeUndefined();
    expect(cleaned?.user).toEqual({ id: 'user-1' });
    expect(cleaned?.extra).toBeUndefined();
  });
});
