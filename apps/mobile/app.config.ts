import type { ExpoConfig } from 'expo/config';

const buildProfile =
  process.env.EAS_BUILD_PROFILE ?? process.env.APP_VARIANT ?? 'development';
const allowsLocalHttp = buildProfile === 'development';

const config: ExpoConfig = {
  name: 'LightBuy',
  slug: 'lightbuy',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  plugins: [
    'expo-dev-client',
    'expo-secure-store',
    [
      'expo-build-properties',
      { android: { usesCleartextTraffic: allowsLocalHttp } },
    ],
    '@sentry/react-native/expo',
    'posthog-react-native/expo',
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.lightbuy.mobile',
    buildNumber: '1',
    infoPlist: allowsLocalHttp
      ? {
          NSAppTransportSecurity: {
            NSAllowsArbitraryLoads: true,
            NSAllowsLocalNetworking: true,
          },
        }
      : undefined,
  },
  android: {
    package: 'com.lightbuy.mobile',
    versionCode: 1,
  },
  extra: {
    buildProfile,
  },
};

export default config;
