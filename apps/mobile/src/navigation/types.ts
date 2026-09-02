import type { NavigatorScreenParams } from '@react-navigation/native';
import type { CheckoutSource } from '../utils/create-order-request';

export type TabParamList = {
  Home: undefined;
  Cart: undefined;
  Me: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  Search: undefined;
  ProductDetail: {
    productId: string;
    from?: 'home' | 'search' | 'cart' | 'unknown';
  };
  Checkout: CheckoutSource;
  OrderList: undefined;
  OrderDetail: { orderId: string };
  AddressList: undefined;
  AddressEdit: { addressId?: string };
  Login: undefined;
  Register: undefined;
  Settings: undefined;
  UiKitPreview: undefined;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- RN 根路由扩充
    interface RootParamList extends RootStackParamList {}
  }
}
