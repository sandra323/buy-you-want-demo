export type AnalyticsEnvironment = Record<string, string | undefined>;

export type AnalyticsConfig = {
  enabled: boolean;
  environment: string;
  release: string;
  sentryDsn?: string;
  posthogKey?: string;
  posthogHost: string;
};

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildAnalyticsConfig(
  env: AnalyticsEnvironment,
  isDev: boolean,
  appVersion = '0.0.0',
  buildVersion = 'dev',
): AnalyticsConfig {
  const telemetryInDev = env.EXPO_PUBLIC_TELEMETRY_IN_DEV === '1';
  const environment =
    nonEmpty(env.EXPO_PUBLIC_APP_ENV) ?? (isDev ? 'development' : 'production');
  const release =
    nonEmpty(env.EXPO_PUBLIC_APP_RELEASE) ??
    `lightbuy-mobile@${appVersion}+${buildVersion}`;

  return {
    enabled: !isDev || telemetryInDev,
    environment,
    release,
    sentryDsn: nonEmpty(env.EXPO_PUBLIC_SENTRY_DSN),
    posthogKey:
      nonEmpty(env.EXPO_PUBLIC_POSTHOG_KEY) ??
      nonEmpty(env.EXPO_PUBLIC_POSTHOG_API_KEY),
    posthogHost:
      nonEmpty(env.EXPO_PUBLIC_POSTHOG_HOST) ?? 'https://us.i.posthog.com',
  };
}
