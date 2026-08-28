import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ProductSort } from '@lightbuy/shared';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  EmptyState,
  ListSkeleton,
  LoginGate,
  PriceText,
  ProductCard,
  QtyStepper,
  SortBar,
} from '../components';
import { tokens } from '../theme';

const DEMO_PRODUCT = {
  id: 'kit-1',
  name: 'ui-kit ProductCard',
  price: 59.9,
  originalPrice: 89,
  mainImage: 'https://picsum.photos/id/21/400/440',
  sales: 42,
  stock: 5,
};

export function UiKitPreviewScreen() {
  const [sort, setSort] = useState(ProductSort.Comprehensive);
  const [qty, setQty] = useState(1);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text variant="titleSmall" style={styles.label}>
        PriceText
      </Text>
      <PriceText price={59.9} originalPrice={89} />
      <Text variant="titleSmall" style={styles.label}>
        SortBar
      </Text>
      <SortBar value={sort} onChange={setSort} />
      <Text variant="titleSmall" style={styles.label}>
        QtyStepper
      </Text>
      <QtyStepper value={qty} onChange={setQty} />
      <Text variant="titleSmall" style={styles.label}>
        ProductCard
      </Text>
      <ProductCard product={DEMO_PRODUCT} width={160} />
      <Text variant="titleSmall" style={styles.label}>
        ListSkeleton
      </Text>
      <ListSkeleton rows={2} />
      <Text variant="titleSmall" style={styles.label}>
        EmptyState
      </Text>
      <EmptyState
        title="暂无商品"
        description="去首页逛逛"
        ctaLabel="去逛逛"
        illustration={
          <MaterialCommunityIcons
            name="shopping-outline"
            size={48}
            color={tokens.color.textTertiary}
          />
        }
        onCtaPress={() => undefined}
      />
      <Text variant="titleSmall" style={styles.label}>
        LoginGate
      </Text>
      <View style={styles.gate}>
        <LoginGate />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
  },
  content: {
    padding: tokens.space.lg,
    gap: tokens.space.md,
    paddingBottom: tokens.space.xl,
  },
  label: {
    color: tokens.color.textPrimary,
    marginTop: tokens.space.sm,
  },
  gate: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.card,
  },
});
