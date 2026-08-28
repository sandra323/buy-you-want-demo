import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { ProductCard as ProductCardData } from '@lightbuy/shared';

import { tokens } from '../theme';
import { getImageAspectRatio } from '../utils/image-aspect-ratio';
import { distributeWaterfallColumns } from '../utils/waterfall-columns';
import { ProductCard, estimateProductCardHeight } from './ProductCard';

type ProductWaterfallProps = {
  products: ProductCardData[];
  onProductPress: (productId: string) => void;
};

export function ProductWaterfall({
  products,
  onProductPress,
}: ProductWaterfallProps) {
  const { width } = useWindowDimensions();
  const [layoutVersion, setLayoutVersion] = useState(0);
  const cardWidth = Math.floor(
    (width - tokens.space.lg * 2 - tokens.space.md) / 2,
  );

  const estimateHeight = useCallback(
    (product: ProductCardData) =>
      estimateProductCardHeight(
        cardWidth,
        getImageAspectRatio(product.mainImage),
      ),
    [cardWidth],
  );

  const [leftColumn, rightColumn] = useMemo(() => {
    void layoutVersion;
    return distributeWaterfallColumns(products, estimateHeight);
  }, [estimateHeight, layoutVersion, products]);

  const renderColumn = (columnProducts: ProductCardData[]) =>
    columnProducts.map((product) => (
      <ProductCard
        key={product.id}
        product={product}
        width={cardWidth}
        onAspectRatioChange={() => setLayoutVersion((value) => value + 1)}
        onPress={() => onProductPress(product.id)}
      />
    ));

  return (
    <View style={styles.waterfall}>
      <View style={styles.column}>{renderColumn(leftColumn)}</View>
      <View style={styles.column}>{renderColumn(rightColumn)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  waterfall: {
    flexDirection: 'row',
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
    gap: tokens.space.md,
  },
  column: {
    flex: 1,
  },
});
