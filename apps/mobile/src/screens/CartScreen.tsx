import { StyleSheet, View } from 'react-native';

import { LoginGate } from '../components';
import { tokens } from '../theme';

export function CartScreen() {
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

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
    justifyContent: 'center',
  },
});
