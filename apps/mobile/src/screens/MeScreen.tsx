import { StyleSheet, View } from 'react-native';

import { LoginGate } from '../components';
import { tokens } from '../theme';

export function MeScreen() {
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

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
    justifyContent: 'center',
  },
});
