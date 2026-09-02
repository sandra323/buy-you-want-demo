/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^expo-secure-store$': '<rootDir>/src/test/mocks/expo-secure-store.ts',
    '^expo-application$': '<rootDir>/src/test/mocks/expo-application.ts',
    '^@sentry/react-native$': '<rootDir>/src/test/mocks/sentry-react-native.ts',
    '^posthog-react-native$':
      '<rootDir>/src/test/mocks/posthog-react-native.ts',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/src/test/mocks/async-storage.ts',
  },
};
