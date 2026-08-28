import { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, Snackbar } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { hydrateAuth } from './src/auth/hydrate';
import { setSessionExpiryHandler } from './src/auth/session-expiry';
import { navigationRef } from './src/navigation/ref';
import { RootNavigator } from './src/navigation/RootNavigator';
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
    void hydrateAuth();
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
          <NavigationContainer ref={navigationRef} theme={navigationTheme}>
            <RootNavigator />
            <StatusBar style="dark" />
          </NavigationContainer>
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
