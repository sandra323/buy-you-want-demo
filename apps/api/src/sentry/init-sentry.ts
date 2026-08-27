import * as Sentry from '@sentry/nestjs';
import { buildSentryInitOptions } from './sentry-options';

export type SentryInitFn = typeof Sentry.init;

/**
 * Initialize Sentry when `SENTRY_DSN` is non-empty. Skips init when unset,
 * empty, or whitespace-only so the API still boots without a DSN.
 */
export function initSentry(
  env: NodeJS.ProcessEnv = process.env,
  init: SentryInitFn = Sentry.init,
): boolean {
  const options = buildSentryInitOptions(env);
  if (!options) {
    return false;
  }

  init(options);
  return true;
}
