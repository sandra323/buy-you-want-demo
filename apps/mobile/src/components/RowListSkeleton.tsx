import { StyleSheet, View } from 'react-native';

import { tokens } from '../theme';

type RowListSkeletonProps = {
  rows?: number;
};

export function RowListSkeleton({ rows = 4 }: RowListSkeletonProps) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.image} />
          <View style={styles.body}>
            <View style={styles.title} />
            <View style={styles.meta} />
            <View style={styles.price} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
  row: {
    minHeight: 112,
    flexDirection: 'row',
    gap: tokens.space.md,
    padding: tokens.space.md,
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.surface,
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.disabledFill,
  },
  body: {
    flex: 1,
    gap: tokens.space.md,
  },
  title: {
    width: '82%',
    height: 16,
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.disabledFill,
  },
  meta: {
    width: '48%',
    height: 12,
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.disabledFill,
  },
  price: {
    width: '35%',
    height: 16,
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.disabledFill,
  },
});
