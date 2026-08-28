import { StyleSheet, View } from 'react-native';

import { tokens } from '../theme';

type ListSkeletonProps = {
  rows?: number;
};

function SkeletonBlock({
  width,
  height,
  radius = tokens.radius.input,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
}) {
  return (
    <View style={[styles.block, { width, height, borderRadius: radius }]} />
  );
}

/** 列表首屏骨架，避免整页 spinner。 */
export function ListSkeleton({ rows = 4 }: ListSkeletonProps) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.card}>
          <SkeletonBlock
            width="100%"
            height={120}
            radius={tokens.radius.card}
          />
          <View style={styles.body}>
            <SkeletonBlock width="80%" height={14} />
            <SkeletonBlock width="40%" height={16} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
  card: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    overflow: 'hidden',
  },
  body: {
    padding: tokens.space.md,
    gap: tokens.space.sm,
  },
  block: {
    backgroundColor: tokens.color.disabledFill,
  },
});
