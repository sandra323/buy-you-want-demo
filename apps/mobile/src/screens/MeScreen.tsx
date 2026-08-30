import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { User } from '@lightbuy/shared';

import { getMe } from '../api/user';
import { LoginGate } from '../components';
import { useAuthStore } from '../store/auth';
import { useToastStore } from '../store/toast';
import { tokens } from '../theme';

export function MeScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const showToast = useToastStore((s) => s.show);
  const [profile, setProfile] = useState<User | null>(user);

  useFocusEffect(
    useCallback(() => {
      if (!useAuthStore.getState().user) {
        setProfile(null);
        return undefined;
      }
      let active = true;
      void getMe()
        .then((next) => {
          if (active) {
            setProfile(next);
          }
        })
        .catch(() => {
          if (active) {
            showToast('个人信息加载失败，已显示当前会话信息');
          }
        });
      return () => {
        active = false;
      };
    }, [showToast]),
  );

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
      <View style={styles.profile}>
        <Text variant="titleLarge" style={styles.name}>
          {profile?.nickname || user.nickname || '轻买用户'}
        </Text>
        <Text style={styles.mask}>{profile?.phoneMask || user.phoneMask}</Text>
      </View>
      <View style={styles.menu}>
        <Button
          mode="outlined"
          icon="script-text-outline"
          onPress={() => navigation.navigate('OrderList')}
          contentStyle={styles.ctaContent}
        >
          我的订单
        </Button>
        <Button
          mode="outlined"
          icon="map-marker-outline"
          onPress={() => navigation.navigate('AddressList')}
          contentStyle={styles.ctaContent}
        >
          收货地址
        </Button>
        <Button
          mode="outlined"
          icon="cog-outline"
          onPress={() => navigation.navigate('Settings')}
          contentStyle={styles.ctaContent}
        >
          设置
        </Button>
      </View>
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
  profile: {
    padding: tokens.space.lg,
    gap: tokens.space.sm,
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.surface,
  },
  menu: {
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
