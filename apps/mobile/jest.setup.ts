process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
(global as typeof globalThis & { __DEV__: boolean }).__DEV__ = true;
