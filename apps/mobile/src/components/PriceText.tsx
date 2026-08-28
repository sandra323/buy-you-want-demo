import { StyleSheet, Text, View } from 'react-native';

import { tokens } from '../theme';

type PriceTextProps = {
  price: number;
  originalPrice?: number | null;
  size?: 'sm' | 'md';
};

function formatYuan(value: number): string {
  return `¥${value.toFixed(2)}`;
}

export function PriceText({
  price,
  originalPrice,
  size = 'md',
}: PriceTextProps) {
  const showOriginal = originalPrice != null && originalPrice > price;

  return (
    <View style={styles.row}>
      <Text
        style={[styles.price, size === 'sm' ? styles.priceSm : styles.priceMd]}
      >
        {formatYuan(price)}
      </Text>
      {showOriginal ? (
        <Text style={styles.original}>{formatYuan(originalPrice)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
  },
  price: {
    color: tokens.color.price,
    fontWeight: '700',
  },
  priceSm: {
    fontSize: 14,
  },
  priceMd: {
    fontSize: 18,
  },
  original: {
    color: tokens.color.originalPrice,
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
});
