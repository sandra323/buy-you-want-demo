import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { tokens } from '../theme';

type EmptyStateProps = {
  title: string;
  description?: string;
  illustration?: ReactNode;
  ctaLabel?: string;
  onCtaPress?: () => void;
};

export function EmptyState({
  title,
  description,
  illustration,
  ctaLabel,
  onCtaPress,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {illustration ? (
        <View style={styles.illustration}>{illustration}</View>
      ) : null}
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text variant="bodyMedium" style={styles.description}>
          {description}
        </Text>
      ) : null}
      {ctaLabel && onCtaPress ? (
        <Button
          mode="contained"
          onPress={onCtaPress}
          contentStyle={styles.ctaContent}
          style={styles.cta}
        >
          {ctaLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space.xl,
    gap: tokens.space.md,
  },
  illustration: {
    marginBottom: tokens.space.sm,
  },
  title: {
    color: tokens.color.textPrimary,
    textAlign: 'center',
  },
  description: {
    color: tokens.color.textSecondary,
    textAlign: 'center',
  },
  cta: {
    marginTop: tokens.space.sm,
    borderRadius: tokens.radius.input,
  },
  ctaContent: {
    minHeight: tokens.minTouch,
    paddingHorizontal: tokens.space.lg,
  },
});
