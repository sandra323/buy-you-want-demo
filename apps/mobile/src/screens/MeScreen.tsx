import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import { LoginGate } from '../components';
import { useAuthStore } from '../store/auth';
import { tokens } from '../theme';

export function MeScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  if (isHydrating) {
    return <View style={styles.page} />;
  }

  if (!user) {
    return (
      <View style={styles.page}>
        <LoginGate
          title="登录后查看我的"
          description="订单、地址与设置将在登录后可用"
          ctaLabel="去登录"
        />
      </View>
    );
  }

  return (
    <View style={styles.member}>
      <Text variant="titleMedium" style={styles.name}>
        {user.nickname || '轻买用户'}
      </Text>
      <Text style={styles.mask}>{user.phoneMask}</Text>
      <Button
        mode="outlined"
        onPress={() => navigation.navigate('Settings')}
        contentStyle={styles.ctaContent}
      >
        设置
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
    justifyContent: 'center',
  },
  member: {
    flex: 1,
    backgroundColor: tokens.color.background,
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
  name: {
    color: tokens.color.textPrimary,
  },
  mask: {
    color: tokens.color.textSecondary,
  },
  ctaContent: {
    minHeight: tokens.minTouch,
  },
});
