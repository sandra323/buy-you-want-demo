import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import { tokens } from '../theme';

export function LoginScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.page}>
      <Text variant="headlineSmall" style={styles.title}>
        登录
      </Text>
      <Text style={styles.hint}>占位页，真实登录在 M7 接入。</Text>
      <Button
        mode="text"
        onPress={() => navigation.navigate('Register')}
        contentStyle={styles.linkContent}
      >
        没有账号？去注册
      </Button>
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
  title: {
    color: tokens.color.textPrimary,
  },
  hint: {
    color: tokens.color.textSecondary,
  },
  linkContent: {
    minHeight: tokens.minTouch,
  },
});
