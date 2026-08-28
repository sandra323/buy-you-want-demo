import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Menu, Text } from 'react-native-paper';
import { ProductSort } from '@lightbuy/shared';

import { tokens } from '../theme';

type SortBarProps = {
  value: ProductSort;
  onChange: (sort: ProductSort) => void;
};

const COMPREHENSIVE_OPTIONS: { sort: ProductSort; label: string }[] = [
  { sort: ProductSort.Comprehensive, label: '综合' },
  { sort: ProductSort.PriceDesc, label: '价格从高到低' },
  { sort: ProductSort.PriceAsc, label: '价格从低到高' },
];

function comprehensiveLabel(value: ProductSort): string {
  if (value === ProductSort.PriceDesc) return '价格高';
  if (value === ProductSort.PriceAsc) return '价格低';
  return '综合';
}

export function SortBar({ value, onChange }: SortBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const comprehensiveActive =
    value === ProductSort.Comprehensive ||
    value === ProductSort.PriceDesc ||
    value === ProductSort.PriceAsc;

  return (
    <View style={styles.bar}>
      <Menu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        anchor={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="综合排序"
            onPress={() => setMenuOpen(true)}
            style={styles.tab}
          >
            <Text
              style={[
                styles.tabLabel,
                comprehensiveActive && styles.tabLabelActive,
              ]}
            >
              {comprehensiveLabel(value)} ▾
            </Text>
          </Pressable>
        }
      >
        {COMPREHENSIVE_OPTIONS.map((option) => (
          <Menu.Item
            key={option.sort}
            title={option.label}
            onPress={() => {
              onChange(option.sort);
              setMenuOpen(false);
            }}
          />
        ))}
      </Menu>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="按销量排序"
        onPress={() => onChange(ProductSort.Sales)}
        style={styles.tab}
      >
        <Text
          style={[
            styles.tabLabel,
            value === ProductSort.Sales && styles.tabLabelActive,
          ]}
        >
          销量
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="按上新排序"
        onPress={() => onChange(ProductSort.Newest)}
        style={styles.tab}
      >
        <Text
          style={[
            styles.tabLabel,
            value === ProductSort.Newest && styles.tabLabelActive,
          ]}
        >
          上新
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: tokens.color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.line,
  },
  tab: {
    flex: 1,
    minHeight: tokens.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    color: tokens.color.textSecondary,
    fontSize: 14,
  },
  tabLabelActive: {
    color: tokens.color.primary,
    fontWeight: '600',
  },
});
