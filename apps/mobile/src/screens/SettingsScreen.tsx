import { useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Divider, Switch, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import {
  isTelemetryEnabled,
  setTelemetryEnabled,
  subscribeTelemetryState,
  trackClick,
  trackLogout,
} from '../analytics';
import { logout } from '../api/auth';
import { apiClient } from '../api/client';
import { refreshSession } from '../api/interceptors';
import { getRefreshToken } from '../storage/tokens';
import { useAuthStore } from '../store/auth';
import { useToastStore } from '../store/toast';
import { tokens } from '../theme';

export function SettingsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const logoutLocal = useAuthStore((s) => s.logoutLocal);
  const showToast = useToastStore((s) => s.show);
  const telemetryEnabled = useSyncExternalStore(
    subscribeTelemetryState,
    isTelemetryEnabled,
    isTelemetryEnabled,
  );
  const [busy, setBusy] = useState(false);
  const [telemetryBusy, setTelemetryBusy] = useState(false);

  async function onToggleTelemetry(enabled: boolean) {
    if (telemetryBusy) return;
    setTelemetryBusy(true);
    try {
      await setTelemetryEnabled(enabled);
    } catch {
      showToast('保存数据分析设置失败，请重试');
    } finally {
      setTelemetryBusy(false);
    }
  }

  async function onLogout() {
    trackClick('settings', 'logout');
    setBusy(true);
    try {
      if (await getRefreshToken()) {
        await refreshSession(apiClient);
      }
      await logout();
    } catch {
      // Local wipe is mandatory even when revoke fails.
    } finally {
      trackLogout();
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
        {user ? `当前账号 ${user.phoneMask}` : '未登录也可关闭数据分析'}
      </Text>
      <View style={styles.settingRow}>
        <View style={styles.settingCopy}>
          <Text variant="titleSmall">业务分析与会话回放</Text>
          <Text style={styles.hint}>
            关闭后停止业务事件和回放；崩溃监控仍保持开启
          </Text>
        </View>
        <Switch
          accessibilityLabel="业务分析与会话回放"
          value={telemetryEnabled}
          disabled={telemetryBusy}
          onValueChange={(enabled) => void onToggleTelemetry(enabled)}
        />
      </View>
      {user ? (
        <>
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
