import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Divider, Switch, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import { logout } from '../api/auth';
import { apiClient } from '../api/client';
import { refreshSession } from '../api/interceptors';
import { getRefreshToken } from '../storage/tokens';
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
      if (await getRefreshToken()) {
        await refreshSession(apiClient);
      }
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
        <>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text variant="titleSmall">数据分析</Text>
              <Text style={styles.hint}>采集开关将在后续版本开放</Text>
            </View>
            <Switch value={false} disabled />
          </View>
          <Divider />
          <Button
            mode="contained"
            onPress={() => void onLogout()}
            loading={busy}
            disabled={busy}
            contentStyle={styles.ctaContent}
          >
            退出登录
          </Button>
        </>
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
  settingRow: {
    minHeight: tokens.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: tokens.space.md,
  },
  settingCopy: {
    flex: 1,
    gap: tokens.space.xs,
  },
  ctaContent: {
    minHeight: tokens.minTouch,
  },
});
