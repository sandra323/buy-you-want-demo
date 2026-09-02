import { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, Snackbar } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  initAnalytics,
  navigationAnalytics,
  registerSentryNavigationContainer,
  syncUserIdentity,
  trackAppLaunch,
} from './src/analytics';
import { hydrateAuth } from './src/auth/hydrate';
import { setSessionExpiryHandler } from './src/auth/session-expiry';
import { AddToCartAnimationOverlay } from './src/components';
import { navigationRef } from './src/navigation/ref';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/auth';
import { useToastStore } from './src/store/toast';
import { theme, tokens } from './src/theme';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: tokens.color.primary,
    background: tokens.color.background,
    card: tokens.color.surface,
    text: tokens.color.textPrimary,
    border: tokens.color.line,
    notification: tokens.color.primary,
  },
};

export default function App() {
  const toast = useToastStore((s) => s.message);
  const dismissToast = useToastStore((s) => s.dismiss);

  useEffect(() => {
    let disposed = false;
    let unsubscribeAuth: (() => void) | undefined;
    void (async () => {
      await initAnalytics();
      if (disposed) return;

      trackAppLaunch();
      syncUserIdentity(useAuthStore.getState().user?.id ?? null);
      unsubscribeAuth = useAuthStore.subscribe((state, previous) => {
        if (state.user?.id !== previous.user?.id) {
          syncUserIdentity(state.user?.id ?? null);
        }
      });
      if (navigationRef.isReady()) {
        registerSentryNavigationContainer(navigationRef);
        navigationAnalytics.track(navigationRef.getCurrentRoute());
      }
      await hydrateAuth();
    })();
    return () => {
      disposed = true;
      unsubscribeAuth?.();
    };
  }, []);

  useEffect(() => {
    setSessionExpiryHandler({
      getRouteName: () => navigationRef.getCurrentRoute()?.name,
      navigateLogin: () => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('Login');
        }
      },
    });
    return () => setSessionExpiryHandler(null);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer
            ref={navigationRef}
            theme={navigationTheme}
            onReady={() => {
              registerSentryNavigationContainer(navigationRef);
              navigationAnalytics.track(navigationRef.getCurrentRoute());
            }}
            onStateChange={() =>
              navigationAnalytics.track(navigationRef.getCurrentRoute())
            }
          >
            <RootNavigator />
            <StatusBar style="dark" />
          </NavigationContainer>
          <AddToCartAnimationOverlay />
          <Snackbar visible={Boolean(toast)} onDismiss={dismissToast}>
            {toast}
          </Snackbar>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
