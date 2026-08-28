import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Cart: undefined;
  Me: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  Search: undefined;
  ProductDetail: { productId: string };
  Checkout: undefined;
  OrderList: undefined;
  OrderDetail: { orderId?: string };
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
