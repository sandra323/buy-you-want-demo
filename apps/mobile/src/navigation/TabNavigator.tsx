import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { CartScreen } from '../screens/CartScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MeScreen } from '../screens/MeScreen';
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
  return (
    <MaterialCommunityIcons name="cart-outline" color={color} size={size} />
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
          tabBarIcon: CartTabIcon,
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
