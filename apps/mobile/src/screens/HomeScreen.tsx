import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProductSort } from '@lightbuy/shared';
import { Text } from 'react-native-paper';

import { ProductCard, QtyStepper, SortBar } from '../components';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { tokens } from '../theme';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const DEMO_PRODUCT = {
  id: 'demo-1',
  name: '占位商品（M8 接目录）',
  price: 99,
  originalPrice: 129,
  mainImage: 'https://picsum.photos/id/20/400/440',
  sales: 128,
  stock: 10,
};

const LINKS: { label: string; onPress: (nav: HomeNav) => void }[] = [
  { label: '搜索', onPress: (nav) => nav.navigate('Search') },
  {
    label: '商品详情',
    onPress: (nav) => nav.navigate('ProductDetail', { productId: 'demo-1' }),
  },
  { label: '结算', onPress: (nav) => nav.navigate('Checkout') },
  { label: '订单列表', onPress: (nav) => nav.navigate('OrderList') },
  {
    label: '订单详情',
    onPress: (nav) => nav.navigate('OrderDetail', { orderId: 'demo-order' }),
  },
  { label: '地址列表', onPress: (nav) => nav.navigate('AddressList') },
  { label: '地址编辑', onPress: (nav) => nav.navigate('AddressEdit', {}) },
  { label: '登录', onPress: (nav) => nav.navigate('Login') },
  { label: '注册', onPress: (nav) => nav.navigate('Register') },
  { label: '设置', onPress: (nav) => nav.navigate('Settings') },
  { label: '组件预览', onPress: (nav) => nav.navigate('UiKitPreview') },
];

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const { width } = useWindowDimensions();
  const [sort, setSort] = useState(ProductSort.Comprehensive);
  const [qty, setQty] = useState(1);
  const cardWidth = Math.floor(
    (width - tokens.space.lg * 2 - tokens.space.md) / 2,
  );

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="搜索"
        onPress={() => navigation.navigate('Search')}
        style={styles.search}
      >
        <Text style={styles.searchText}>搜索商品</Text>
      </Pressable>
      <SortBar value={sort} onChange={setSort} />
      <View style={styles.row}>
        <ProductCard
          product={DEMO_PRODUCT}
          width={cardWidth}
          onPress={() =>
            navigation.navigate('ProductDetail', { productId: DEMO_PRODUCT.id })
          }
        />
      </View>
      <View style={styles.stepper}>
        <Text style={styles.hint}>数量</Text>
        <QtyStepper value={qty} onChange={setQty} max={99} />
      </View>
      <Text variant="titleSmall" style={styles.section}>
        占位路由（核对导航树）
      </Text>
      {LINKS.map((link) => (
        <Pressable
          key={link.label}
          accessibilityRole="button"
          onPress={() => link.onPress(navigation)}
          style={styles.link}
        >
          <Text style={styles.linkText}>{link.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.color.background,
  },
  content: {
    paddingBottom: tokens.space.xl,
  },
  search: {
    margin: tokens.space.lg,
    minHeight: tokens.minTouch,
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.surface,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.lg,
  },
  searchText: {
    color: tokens.color.textTertiary,
  },
  row: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    padding: tokens.space.lg,
  },
  hint: {
    color: tokens.color.textSecondary,
  },
  section: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.md,
    color: tokens.color.textPrimary,
  },
  link: {
    minHeight: tokens.minTouch,
    justifyContent: 'center',
    paddingHorizontal: tokens.space.lg,
    backgroundColor: tokens.color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.line,
  },
  linkText: {
    color: tokens.color.primary,
  },
});
