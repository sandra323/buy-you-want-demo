import type { ErrorEvent } from '@sentry/nestjs';
import * as Sentry from '@sentry/nestjs';

const SENSITIVE_HEADER = /^(authorization|cookie|set-cookie)$/i;

export type SentryInitOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

export function resolveSentryDsn(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const dsn = env.SENTRY_DSN?.trim();
  return dsn || undefined;
}

export function resolveSentryRelease(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const release = env.SENTRY_RELEASE?.trim();
  return release || undefined;
}

/** Drop auth tokens and cookies from Sentry payloads. Never attach extras. */
export function stripSentryPii(event: ErrorEvent): ErrorEvent | null {
  const headers = event.request?.headers;
  if (headers && typeof headers === 'object') {
    for (const key of Object.keys(headers)) {
      if (SENSITIVE_HEADER.test(key)) {
        delete headers[key];
      }
    }
  }

  if (event.request && 'cookies' in event.request) {
    delete event.request.cookies;
  }

  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }

  delete event.extra;
  return event;
}

/** Returns init options, or `undefined` when DSN is missing/blank (Sentry disabled). */
export function buildSentryInitOptions(
  env: NodeJS.ProcessEnv = process.env,
): SentryInitOptions | undefined {
  const dsn = resolveSentryDsn(env);
  if (!dsn) {
    return undefined;
  }

  return {
    dsn,
    release: resolveSentryRelease(env),
    sendDefaultPii: false,
    beforeSend: stripSentryPii,
  };
}
