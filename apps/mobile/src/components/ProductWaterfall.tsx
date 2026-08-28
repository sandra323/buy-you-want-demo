import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { ProductCard as ProductCardData } from '@lightbuy/shared';

import { tokens } from '../theme';
import { getImageAspectRatio } from '../utils/image-aspect-ratio';
import type { ProductLayout } from '../utils/product-exposure';
import { distributeWaterfallColumns } from '../utils/waterfall-columns';
import { ProductCard, estimateProductCardHeight } from './ProductCard';

type ProductWaterfallProps = {
  products: ProductCardData[];
  onProductPress: (productId: string) => void;
  onProductLayout?: (productId: string, layout: ProductLayout) => void;
};

export function ProductWaterfall({
  products,
  onProductPress,
  onProductLayout,
}: ProductWaterfallProps) {
  const { width } = useWindowDimensions();
  const [layoutVersion, setLayoutVersion] = useState(0);
  const waterfallYRef = useRef(0);
  const cardLayoutsRef = useRef(new Map<string, ProductLayout>());
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

  useEffect(() => {
    const productIds = new Set(products.map((product) => product.id));
    for (const productId of cardLayoutsRef.current.keys()) {
      if (!productIds.has(productId)) {
        cardLayoutsRef.current.delete(productId);
      }
    }
  }, [products]);

  const emitProductLayout = useCallback(
    (productId: string, layout: ProductLayout) => {
      cardLayoutsRef.current.set(productId, layout);
      onProductLayout?.(productId, {
        y: waterfallYRef.current + tokens.space.md + layout.y,
        height: layout.height,
      });
    },
    [onProductLayout],
  );

  const handleWaterfallLayout = useCallback(
    (event: LayoutChangeEvent) => {
      waterfallYRef.current = event.nativeEvent.layout.y;
      for (const [productId, layout] of cardLayoutsRef.current) {
        onProductLayout?.(productId, {
          y: waterfallYRef.current + tokens.space.md + layout.y,
          height: layout.height,
        });
      }
    },
    [onProductLayout],
  );

  const renderColumn = (columnProducts: ProductCardData[]) =>
    columnProducts.map((product) => (
      <View
        key={product.id}
        onLayout={(event) =>
          emitProductLayout(product.id, event.nativeEvent.layout)
        }
      >
        <ProductCard
          product={product}
          width={cardWidth}
          onAspectRatioChange={() => setLayoutVersion((value) => value + 1)}
          onPress={() => onProductPress(product.id)}
        />
      </View>
    ));

  return (
    <View style={styles.waterfall} onLayout={handleWaterfallLayout}>
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
