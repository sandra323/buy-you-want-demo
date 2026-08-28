import { CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';

/** Drop Login/Register so goBack lands on the source screen, not the auth stack. */
export function dismissAuthScreens(
  navigation: NativeStackNavigationProp<RootStackParamList>,
): void {
  navigation.dispatch((state) => {
    const routes = state.routes.filter(
      (route) => route.name !== 'Login' && route.name !== 'Register',
    );
    if (routes.length === 0) {
      return CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
    return CommonActions.reset({
      index: routes.length - 1,
      routes,
    });
  });
}
