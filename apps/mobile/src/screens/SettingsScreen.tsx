import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import { logout } from '../api/auth';
import { useAuthStore } from '../store/auth';
import { tokens } from '../theme';

export function SettingsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const logoutLocal = useAuthStore((s) => s.logoutLocal);
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await logout();
    } catch {
      // Local wipe is mandatory even when revoke fails.
    } finally {
      await logoutLocal();
      setBusy(false);
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }
  }

  return (
    <View style={styles.page}>
      <Text variant="bodyMedium" style={styles.hint}>
        {user ? `当前账号 ${user.phoneMask}` : '未登录'}
      </Text>
      {user ? (
        <Button
          mode="contained"
          onPress={() => void onLogout()}
          loading={busy}
          disabled={busy}
          contentStyle={styles.ctaContent}
        >
          退出登录
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
  hint: {
    color: tokens.color.textSecondary,
  },
  ctaContent: {
    minHeight: tokens.minTouch,
  },
});
