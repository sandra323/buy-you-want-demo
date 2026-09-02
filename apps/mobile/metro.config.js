const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const sharedRoot = path.resolve(workspaceRoot, 'packages/shared');

const config = getSentryExpoConfig(projectRoot);

config.watchFolders = [workspaceRoot, sharedRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  '@lightbuy/shared': sharedRoot,
};

config.resolver.disableHierarchicalLookup = true;

// posthog-react-native imports `@posthog/core/surveys`, which only exists via
// package exports (`dist/surveys`). Metro with hierarchical lookup disabled
// cannot find a physical `surveys/` folder and the bundle fails (white screen).
const posthogCoreSurveys = require.resolve('@posthog/core/surveys', {
  paths: [workspaceRoot, projectRoot],
});
const expoApplicationShim = path.resolve(
  projectRoot,
  'src/shims/expo-application.ts',
);
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@posthog/core/surveys') {
    return { type: 'sourceFile', filePath: posthogCoreSurveys };
  }
  // Older Dev Client binaries do not include ExpoApplication; the JS package
  // throws and whitescreens. Route to a NativeModules-backed shim instead.
  if (moduleName === 'expo-application') {
    return { type: 'sourceFile', filePath: expoApplicationShim };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
