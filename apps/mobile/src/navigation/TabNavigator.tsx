import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Badge } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { CartScreen } from '../screens/CartScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MeScreen } from '../screens/MeScreen';
import { useCartAnimationStore } from '../store/cart-animation';
import { useCartBadgeStore } from '../store/cart-badge';
import { tokens } from '../theme';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

type TabBarIconProps = { color: string; size: number };

function HomeTabIcon({ color, size }: TabBarIconProps) {
  return (
    <MaterialCommunityIcons name="home-outline" color={color} size={size} />
  );
}

function CartTabIcon({ color, size }: TabBarIconProps) {
  const count = useCartBadgeStore((state) => state.count);
  const pulseId = useCartAnimationStore((state) => state.pulseId);
  const setTarget = useCartAnimationStore((state) => state.setTarget);
  const anchorRef = useRef<View>(null);
  const scale = useSharedValue(1);

  const measureTarget = useCallback(() => {
    requestAnimationFrame(() => {
      anchorRef.current?.measureInWindow((x, y, width, height) => {
        setTarget({ x: x + width / 2, y: y + height / 2 });
      });
    });
  }, [setTarget]);

  useEffect(() => {
    if (pulseId > 0) {
      scale.value = withSequence(
        withSpring(1.35, { damping: 8 }),
        withSpring(1, { damping: 8 }),
      );
    }
  }, [pulseId, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <MaterialCommunityIcons name="cart-outline" color={color} size={size} />
      <View
        ref={anchorRef}
        collapsable={false}
        onLayout={measureTarget}
        style={styles.badgeAnchor}
      >
        {count > 0 ? (
          <Animated.View style={pulseStyle}>
            <Badge size={18} style={styles.badge}>
              {count > 99 ? '99+' : count}
            </Badge>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function MeTabIcon({ color, size }: TabBarIconProps) {
  return (
    <MaterialCommunityIcons name="account-outline" color={color} size={size} />
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: tokens.color.surface },
        headerShadowVisible: false,
        headerTintColor: tokens.color.textPrimary,
        tabBarActiveTintColor: tokens.color.primary,
        tabBarInactiveTintColor: tokens.color.textSecondary,
        tabBarStyle: { backgroundColor: tokens.color.surface },
        sceneStyle: { backgroundColor: tokens.color.background },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '首页',
          tabBarLabel: '首页',
          tabBarIcon: HomeTabIcon,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: '购物车',
          tabBarLabel: '购物车',
          tabBarIcon: (props) => <CartTabIcon {...props} />,
        }}
      />
      <Tab.Screen
        name="Me"
        component={MeScreen}
        options={{
          title: '我的',
          tabBarLabel: '我的',
          tabBarIcon: MeTabIcon,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badgeAnchor: {
    position: 'absolute',
    top: -9,
    right: -12,
    width: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: tokens.color.primary,
  },
});
