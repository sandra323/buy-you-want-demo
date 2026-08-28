import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { tokens } from '../theme';

type PlaceholderScreenProps = {
  body: string;
};

export function PlaceholderScreen({ body }: PlaceholderScreenProps) {
  return (
    <View style={styles.page}>
      <Text variant="bodyLarge" style={styles.body}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
    padding: tokens.space.lg,
  },
  body: {
    color: tokens.color.textSecondary,
  },
});
