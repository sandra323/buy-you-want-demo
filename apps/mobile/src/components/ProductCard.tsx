import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ProductCard as ProductCardData } from '@lightbuy/shared';

import { tokens } from '../theme';
import { PriceText } from './PriceText';

type ProductCardProps = {
  product: ProductCardData;
  /** 瀑布流列宽，由列表父级计算。 */
  width: number;
  onPress?: () => void;
};

export function ProductCard({ product, width, onPress }: ProductCardProps) {
  const imageHeight = Math.round(width * 1.1);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width },
        pressed ? styles.pressed : null,
      ]}
    >
      <Image
        source={{ uri: product.mainImage }}
        style={{ width, height: imageHeight }}
        resizeMode="cover"
      />
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <PriceText
          price={product.price}
          originalPrice={product.originalPrice}
          size="sm"
        />
        <Text style={styles.sales}>已售 {product.sales}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
  },
  body: {
    padding: tokens.space.md,
    gap: tokens.space.xs,
    minHeight: tokens.minTouch,
  },
  name: {
    color: tokens.color.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  sales: {
    color: tokens.color.textTertiary,
    fontSize: 12,
  },
});
