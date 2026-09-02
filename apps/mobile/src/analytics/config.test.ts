import { buildAnalyticsConfig } from './config';

describe('analytics config', () => {
  it('disables telemetry in development unless explicitly enabled', () => {
    expect(buildAnalyticsConfig({}, true).enabled).toBe(false);
    expect(
      buildAnalyticsConfig({ EXPO_PUBLIC_TELEMETRY_IN_DEV: '1' }, true).enabled,
    ).toBe(true);
    expect(
      buildAnalyticsConfig({ EXPO_PUBLIC_TELEMETRY_IN_DEV: 'true' }, true)
        .enabled,
    ).toBe(false);
  });

  it('normalizes blank keys and builds a shared release', () => {
    const config = buildAnalyticsConfig(
      {
        EXPO_PUBLIC_SENTRY_DSN: ' ',
        EXPO_PUBLIC_POSTHOG_KEY: ' ph_test ',
      },
      false,
      '1.2.3',
      '45',
    );

    expect(config.sentryDsn).toBeUndefined();
    expect(config.posthogKey).toBe('ph_test');
    expect(config.release).toBe('lightbuy-mobile@1.2.3+45');
    expect(config.environment).toBe('production');
  });
});
