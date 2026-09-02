import {
  __instances,
  __resetPostHogMock,
} from '../test/mocks/posthog-react-native';
import {
  __resetSentryMock,
  init as sentryInit,
  reactNavigationIntegration,
  setUser,
} from '../test/mocks/sentry-react-native';
import {
  __failNextAsyncStorageGet,
  __failNextAsyncStorageSet,
  __resetAsyncStorage,
} from '../test/mocks/async-storage';
import {
  readTelemetryOptOut,
  writeTelemetryOptOut,
} from '../storage/telemetry-preference';
import {
  __resetAnalyticsForTests,
  capture,
  getAnalyticsInitState,
  initAnalytics,
  isTelemetryEnabled,
  setTelemetryEnabled,
  syncUserIdentity,
} from './client';

describe('analytics client', () => {
  beforeEach(() => {
    __resetAnalyticsForTests();
    __resetPostHogMock();
    __resetSentryMock();
    __resetAsyncStorage();
    process.env.EXPO_PUBLIC_TELEMETRY_IN_DEV = '1';
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'ph_test';
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@sentry.test/1';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_TELEMETRY_IN_DEV;
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  });

  it('initializes once and applies privacy-first SDK options', async () => {
    const first = initAnalytics();
    const second = initAnalytics();
    expect(first).toBe(second);
    await Promise.all([first, second]);

    expect(sentryInit).toHaveBeenCalledTimes(1);
    expect(reactNavigationIntegration).toHaveBeenCalledWith({
      enableTimeToInitialDisplay: true,
    });
    expect(__instances).toHaveLength(1);
    expect(__instances[0]?.options).toMatchObject({
      captureAppLifecycleEvents: false,
      enableSessionReplay: true,
      sessionReplayConfig: {
        maskAllTextInputs: true,
        maskAllImages: true,
        captureLog: false,
        captureNetworkTelemetry: false,
      },
    });
    expect(__instances[0]?.optIn).toHaveBeenCalledTimes(1);
    expect(__instances[0]?.startSessionRecording).toHaveBeenCalledTimes(1);
    expect(getAnalyticsInitState()).toBe('ready');
  });

  it('does not construct PostHog when persisted opt-out is enabled', async () => {
    await writeTelemetryOptOut(true);
    await initAnalytics();

    expect(__instances).toHaveLength(0);
    expect(getAnalyticsInitState()).toBe('disabled');
    expect(capture('app_launch', {})).toBe(false);
  });

  it('keeps PostHog disabled when the preference cannot be read', async () => {
    __failNextAsyncStorageGet();
    await initAnalytics();

    expect(__instances).toHaveLength(0);
    expect(getAnalyticsInitState()).toBe('disabled');
  });

  it('resets the previous identity before identifying another user', async () => {
    await initAnalytics();
    syncUserIdentity('user-a');
    syncUserIdentity('user-b');
    syncUserIdentity(null);

    expect(__instances[0]?.identify.mock.calls).toEqual([
      ['user-a'],
      ['user-b'],
    ]);
    expect(__instances[0]?.reset).toHaveBeenCalledTimes(2);
    expect(setUser).toHaveBeenLastCalledWith(null);
  });

  it('stops capture and replay immediately when the user opts out', async () => {
    await initAnalytics();
    await setTelemetryEnabled(false);

    expect(capture('app_launch', {})).toBe(false);
    expect(__instances[0]?.stopSessionRecording).toHaveBeenCalledTimes(1);
    expect(__instances[0]?.optOut).toHaveBeenCalledTimes(1);
    await expect(readTelemetryOptOut()).resolves.toBe(true);
  });

  it('rolls back the in-memory preference when persistence fails', async () => {
    await initAnalytics();
    __failNextAsyncStorageSet();

    await expect(setTelemetryEnabled(false)).rejects.toThrow(
      'AsyncStorage write failed',
    );
    expect(isTelemetryEnabled()).toBe(true);
    expect(getAnalyticsInitState()).toBe('ready');
  });

  it('does not construct SDKs when keys are missing', async () => {
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    await initAnalytics();

    expect(sentryInit).not.toHaveBeenCalled();
    expect(__instances).toHaveLength(0);
    expect(capture('app_launch', {})).toBe(false);
    expect(getAnalyticsInitState()).toBe('unavailable');
  });

  it('does not send events in development unless the telemetry flag is set', async () => {
    delete process.env.EXPO_PUBLIC_TELEMETRY_IN_DEV;
    await initAnalytics();

    expect(__instances).toHaveLength(0);
    expect(capture('app_launch', {})).toBe(false);
    expect(getAnalyticsInitState()).toBe('unavailable');
  });

  it('sanitizes properties on the successful capture path', async () => {
    await initAnalytics();

    expect(
      capture('view_product', {
        product_id: 'p1',
        from: 'home',
        phone: '13800000000',
        token: 'secret',
      } as Parameters<typeof capture<'view_product'>>[1]),
    ).toBe(true);
    expect(__instances[0]?.capture).toHaveBeenCalledWith('view_product', {
      product_id: 'p1',
      from: 'home',
    });
  });

  it('restores capture and replay after opt-out then opt-in', async () => {
    await initAnalytics();
    await setTelemetryEnabled(false);
    expect(capture('app_launch', {})).toBe(false);

    await setTelemetryEnabled(true);

    expect(isTelemetryEnabled()).toBe(true);
    expect(getAnalyticsInitState()).toBe('ready');
    expect(__instances[0]?.optIn).toHaveBeenCalled();
    expect(__instances[0]?.startSessionRecording).toHaveBeenCalled();
    expect(capture('app_launch', {})).toBe(true);
  });
});
