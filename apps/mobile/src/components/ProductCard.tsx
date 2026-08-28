import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import type { ProductCard as ProductCardData } from '@lightbuy/shared';

import { tokens } from '../theme';
import {
  getImageAspectRatio,
  updateImageAspectRatio,
} from '../utils/image-aspect-ratio';
import { PriceText } from './PriceText';

type ProductCardProps = {
  product: ProductCardData;
  /** 瀑布流列宽，由列表父级计算。 */
  width: number;
  onPress?: () => void;
  /** 主图宽高比更新后通知父级重排瀑布流。 */
  onAspectRatioChange?: () => void;
};

export const PRODUCT_CARD_BODY_HEIGHT = 82;
export const PRODUCT_CARD_VERTICAL_GAP = tokens.space.md;

export function estimateProductCardHeight(
  cardWidth: number,
  imageAspectRatio: number,
): number {
  return (
    Math.round(cardWidth * imageAspectRatio) +
    PRODUCT_CARD_BODY_HEIGHT +
    PRODUCT_CARD_VERTICAL_GAP
  );
}

export function ProductCard({
  product,
  width,
  onPress,
  onAspectRatioChange,
}: ProductCardProps) {
  const [aspectRatio, setAspectRatio] = useState(() =>
    getImageAspectRatio(product.mainImage),
  );
  const imageHeight = Math.round(width * aspectRatio);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width, marginBottom: PRODUCT_CARD_VERTICAL_GAP },
        pressed ? styles.pressed : null,
      ]}
    >
      <Image
        source={{ uri: product.mainImage }}
        style={{ width, height: imageHeight }}
        contentFit="cover"
        transition={200}
        onLoad={(event) => {
          const { width: naturalWidth, height: naturalHeight } = event.source;
          if (!naturalWidth || !naturalHeight) {
            return;
          }
          const nextRatio = naturalHeight / naturalWidth;
          if (updateImageAspectRatio(product.mainImage, nextRatio)) {
            setAspectRatio(nextRatio);
            onAspectRatioChange?.();
          }
        }}
      />
      <View style={styles.body}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.name}>
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
    minHeight: PRODUCT_CARD_BODY_HEIGHT - tokens.space.md * 2,
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
