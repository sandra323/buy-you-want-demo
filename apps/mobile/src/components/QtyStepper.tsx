import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '../theme';

type QtyStepperProps = {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
};

export function QtyStepper({ value, min = 1, max, onChange }: QtyStepperProps) {
  const atMin = value <= min;
  const atMax = max != null && value >= max;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="减少数量"
        disabled={atMin}
        onPress={() => onChange(value - 1)}
        style={({ pressed }) => [
          styles.hit,
          pressed && !atMin ? styles.pressed : null,
        ]}
      >
        <Text style={[styles.glyph, atMin && styles.disabled]}>-</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="增加数量"
        disabled={atMax}
        onPress={() => onChange(value + 1)}
        style={({ pressed }) => [
          styles.hit,
          pressed && !atMax ? styles.pressed : null,
        ]}
      >
        <Text style={[styles.glyph, atMax && styles.disabled]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.line,
    borderRadius: tokens.radius.input,
    overflow: 'hidden',
    backgroundColor: tokens.color.surface,
  },
  hit: {
    minWidth: tokens.minTouch,
    minHeight: tokens.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: tokens.color.primarySoft,
  },
  glyph: {
    fontSize: 20,
    color: tokens.color.textPrimary,
  },
  disabled: {
    color: tokens.color.disabledText,
  },
  value: {
    minWidth: tokens.minTouch,
    textAlign: 'center',
    color: tokens.color.textPrimary,
    fontSize: 16,
  },
});
