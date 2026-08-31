import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { tokens } from '../theme';

type QtyStepperProps = {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
};

function clampQty(value: number, min: number, max?: number): number {
  const upper = max ?? Number.MAX_SAFE_INTEGER;
  return Math.min(upper, Math.max(min, value));
}

export function QtyStepper({
  value,
  min = 1,
  max,
  disabled = false,
  onChange,
}: QtyStepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<TextInput>(null);
  const atMin = disabled || value <= min;
  const atMax = disabled || (max != null && value >= max);

  useEffect(() => {
    if (!editing) {
      setDraft(String(value));
    }
  }, [editing, value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const commitDraft = useCallback(() => {
    setEditing(false);
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(String(value));
      return;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = clampQty(parsed, min, max);
    if (next !== value) {
      onChange(next);
    }
    setDraft(String(next));
  }, [draft, max, min, onChange, value]);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="减少数量"
        disabled={atMin || editing}
        onPress={() => onChange(value - 1)}
        style={({ pressed }) => [
          styles.hit,
          pressed && !atMin ? styles.pressed : null,
        ]}
      >
        <Text style={[styles.glyph, atMin && styles.disabled]}>-</Text>
      </Pressable>
      {editing ? (
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          onBlur={() => commitDraft()}
          onSubmitEditing={() => commitDraft()}
          keyboardType="number-pad"
          selectTextOnFocus
          maxLength={max != null ? String(max).length : 2}
          style={styles.input}
          accessibilityLabel="购买数量"
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="编辑购买数量"
          disabled={disabled}
          onPress={() => {
            setDraft(String(value));
            setEditing(true);
          }}
          style={styles.valueHit}
        >
          <Text style={[styles.value, disabled && styles.disabled]}>
            {value}
          </Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="增加数量"
        disabled={atMax || editing}
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
  valueHit: {
    minWidth: tokens.minTouch,
    minHeight: tokens.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: tokens.minTouch,
    textAlign: 'center',
    color: tokens.color.textPrimary,
    fontSize: 16,
  },
  input: {
    minWidth: tokens.minTouch,
    minHeight: tokens.minTouch,
    paddingHorizontal: tokens.space.xs,
    textAlign: 'center',
    color: tokens.color.textPrimary,
    fontSize: 16,
  },
});
