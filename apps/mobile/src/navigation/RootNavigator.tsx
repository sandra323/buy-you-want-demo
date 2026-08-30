import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddressEditScreen } from '../screens/AddressEditScreen';
import { AddressListScreen } from '../screens/AddressListScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { UiKitPreviewScreen } from '../screens/UiKitPreviewScreen';
import {
  OrderDetailScreen,
  OrderListScreen,
} from '../screens/stack-placeholders';
import { tokens } from '../theme';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: tokens.color.surface },
  headerShadowVisible: false,
  headerTintColor: tokens.color.textPrimary,
  contentStyle: { backgroundColor: tokens.color.background },
};

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: '搜索' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: '商品详情' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: '结算' }}
      />
      <Stack.Screen
        name="OrderList"
        component={OrderListScreen}
        options={{ title: '我的订单' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: '订单详情' }}
      />
      <Stack.Screen
        name="AddressList"
        component={AddressListScreen}
        options={{ title: '收货地址' }}
      />
      <Stack.Screen
        name="AddressEdit"
        component={AddressEditScreen}
        options={{ title: '编辑地址' }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: '登录' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: '注册' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: '设置' }}
      />
      <Stack.Screen
        name="UiKitPreview"
        component={UiKitPreviewScreen}
        options={{ title: '组件预览' }}
      />
    </Stack.Navigator>
  );
}
