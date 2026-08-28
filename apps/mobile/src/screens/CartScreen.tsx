import { StyleSheet, View } from 'react-native';

import { LoginGate } from '../components';
import { PlaceholderScreen } from './PlaceholderScreen';
import { useAuthStore } from '../store/auth';
import { tokens } from '../theme';

export function CartScreen() {
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  if (isHydrating) {
    return <View style={styles.page} />;
  }

  if (!user) {
    return (
      <View style={styles.page}>
        <LoginGate
          title="登录后查看购物车"
          description="游客购物车不同步，登录后即可管理商品"
          ctaLabel="去登录"
        />
      </View>
    );
  }

  return <PlaceholderScreen body="购物车将在 M9 接入" />;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
    justifyContent: 'center',
  },
});
