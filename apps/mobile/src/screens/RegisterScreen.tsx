import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { tokens } from '../theme';

export function RegisterScreen() {
  return (
    <View style={styles.page}>
      <Text variant="headlineSmall" style={styles.title}>
        注册
      </Text>
      <Text style={styles.hint}>占位页，真实注册在 M7 接入。</Text>
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
});
