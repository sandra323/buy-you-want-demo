import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

import {
  readTelemetryOptOut,
  writeTelemetryOptOut,
} from '../storage/telemetry-preference';
import { buildAnalyticsConfig, type AnalyticsConfig } from './config';
import {
  sanitizeEventProperties,
  type AnalyticsEventMap,
  type AnalyticsEventName,
} from './events';

function readNativeAppIdentity(): { version: string; build: string } {
  try {
    // expo-application is native; an older Dev Client may not have it linked yet.
    const Application = require('expo-application') as {
      nativeApplicationVersion: string | null;
      nativeBuildVersion: string | null;
    };
    return {
      version: Application.nativeApplicationVersion ?? '0.0.0',
      build: Application.nativeBuildVersion ?? 'dev',
    };
  } catch {
    return { version: '0.0.0', build: 'dev' };
  }
}

export type AnalyticsInitState =
  'uninitialized' | 'loading_preference' | 'disabled' | 'ready' | 'unavailable';

let initState: AnalyticsInitState = 'uninitialized';
let initPromise: Promise<void> | null = null;
let config: AnalyticsConfig | null = null;
let posthog: PostHog | null = null;
let sentryNavigation:
  ReturnType<typeof Sentry.reactNavigationIntegration> | undefined;
let sentryNavigationRegistered = false;
let preferenceEnabled = true;
let captureEnabled = false;
let desiredUserId: string | null = null;
let appliedUserId: string | null = null;
let preferenceGeneration = 0;
let preferenceWriteQueue: Promise<void> = Promise.resolve();
const stateListeners = new Set<() => void>();

function notifyState(): void {
  for (const listener of stateListeners) listener();
}

function runtimeConfig(): AnalyticsConfig {
  const identity = readNativeAppIdentity();
  return buildAnalyticsConfig(
    {
      EXPO_PUBLIC_TELEMETRY_IN_DEV: process.env.EXPO_PUBLIC_TELEMETRY_IN_DEV,
      EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
      EXPO_PUBLIC_APP_RELEASE: process.env.EXPO_PUBLIC_APP_RELEASE,
      EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
      EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
      EXPO_PUBLIC_POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
      EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    },
    __DEV__,
    identity.version,
    identity.build,
  );
}

function createPostHog(currentConfig: AnalyticsConfig): PostHog {
  const identity = readNativeAppIdentity();
  return new PostHog(currentConfig.posthogKey!, {
    host: currentConfig.posthogHost,
    captureAppLifecycleEvents: false,
    capturePushNotificationOpened: false,
    capturePushNotificationSubscriptions: false,
    enableSessionReplay: true,
    sessionReplayConfig: {
      maskAllTextInputs: true,
      maskAllImages: true,
      maskAllSandboxedViews: true,
      captureLog: false,
      captureNetworkTelemetry: false,
      sampleRate: 1,
    },
    customAppProperties: {
      $app_version: identity.version,
      $app_build: identity.build,
    },
  });
}

function applyIdentity(): void {
  Sentry.setUser(desiredUserId ? { id: desiredUserId } : null);
  if (!posthog || appliedUserId === desiredUserId) return;

  if (appliedUserId !== null) {
    posthog.reset();
    appliedUserId = null;
    if (!captureEnabled) {
      void posthog.optOut().catch(() => undefined);
    }
  }
  if (captureEnabled && desiredUserId) {
    posthog.identify(desiredUserId);
    appliedUserId = desiredUserId;
  }
}

async function applyPostHogEnabled(enabled: boolean): Promise<void> {
  if (!config?.enabled || !config.posthogKey) return;

  if (enabled) {
    posthog ??= createPostHog(config);
    await posthog.optIn();
    await posthog.startSessionRecording();
    captureEnabled = true;
    applyIdentity();
    return;
  }

  captureEnabled = false;
  if (posthog) {
    await posthog.stopSessionRecording();
    await posthog.optOut();
  }
}

export function initAnalytics(): Promise<void> {
  if (initPromise) return initPromise;

  initState = 'loading_preference';
  notifyState();
  initPromise = (async () => {
    config = runtimeConfig();
    if (config.sentryDsn) {
      try {
        sentryNavigation = Sentry.reactNavigationIntegration({
          enableTimeToInitialDisplay: true,
        });
        Sentry.init({
          dsn: config.sentryDsn,
          enabled: config.enabled,
          environment: config.environment,
          release: config.release,
          sendDefaultPii: false,
          tracesSampleRate: config.enabled ? 1 : 0,
          integrations: [sentryNavigation],
        });
      } catch {
        // Crash reporting setup must not block application startup.
      }
    }

    try {
      preferenceEnabled = !(await readTelemetryOptOut());
    } catch {
      preferenceEnabled = false;
    }

    if (!config.enabled || !config.posthogKey) {
      captureEnabled = false;
      initState = preferenceEnabled ? 'unavailable' : 'disabled';
      applyIdentity();
      notifyState();
      return;
    }

    if (!preferenceEnabled) {
      captureEnabled = false;
      initState = 'disabled';
      applyIdentity();
      notifyState();
      return;
    }

    try {
      await applyPostHogEnabled(true);
      initState = 'ready';
    } catch {
      posthog = null;
      captureEnabled = false;
      initState = 'unavailable';
    }
    notifyState();
  })();

  return initPromise;
}

export function capture<K extends AnalyticsEventName>(
  event: K,
  properties: AnalyticsEventMap[K],
): boolean {
  if (!captureEnabled || !posthog) return false;
  try {
    posthog.capture(event, sanitizeEventProperties(event, properties));
    return true;
  } catch {
    return false;
  }
}

export function syncUserIdentity(userId: string | null): void {
  desiredUserId = userId;
  try {
    applyIdentity();
  } catch {
    // Analytics must never break authentication.
  }
}

export function registerSentryNavigationContainer(
  navigationContainerRef: unknown,
): void {
  if (sentryNavigationRegistered || !sentryNavigation) return;
  try {
    sentryNavigation.registerNavigationContainer(navigationContainerRef);
    sentryNavigationRegistered = true;
  } catch {
    // Navigation analytics must remain available if Sentry setup fails.
  }
}

export function getAnalyticsInitState(): AnalyticsInitState {
  return initState;
}

export function isTelemetryEnabled(): boolean {
  return preferenceEnabled;
}

export function subscribeTelemetryState(listener: () => void): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

export async function setTelemetryEnabled(enabled: boolean): Promise<void> {
  const generation = ++preferenceGeneration;
  const previousPersisted = preferenceEnabled;
  preferenceEnabled = enabled;
  captureEnabled = enabled && Boolean(config?.enabled && config.posthogKey);
  notifyState();

  const write = async () => {
    await writeTelemetryOptOut(!enabled);
  };
  const queued = preferenceWriteQueue.then(write, write);
  preferenceWriteQueue = queued.catch(() => undefined);

  try {
    await queued;
    if (generation !== preferenceGeneration) return;
    await applyPostHogEnabled(enabled);
    initState = enabled
      ? config?.enabled && config.posthogKey
        ? 'ready'
        : 'unavailable'
      : 'disabled';
    notifyState();
  } catch (error) {
    if (generation === preferenceGeneration) {
      preferenceEnabled = previousPersisted;
      await applyPostHogEnabled(previousPersisted).catch(() => undefined);
      initState = previousPersisted ? 'ready' : 'disabled';
      notifyState();
    }
    throw error;
  }
}

export function __resetAnalyticsForTests(): void {
  initState = 'uninitialized';
  initPromise = null;
  config = null;
  posthog = null;
  sentryNavigation = undefined;
  sentryNavigationRegistered = false;
  preferenceEnabled = true;
  captureEnabled = false;
  desiredUserId = null;
  appliedUserId = null;
  preferenceGeneration = 0;
  preferenceWriteQueue = Promise.resolve();
  stateListeners.clear();
}
