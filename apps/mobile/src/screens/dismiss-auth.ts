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
    return CommonActions.reset({
      ...state,
      routes,
      index: Math.max(0, routes.length - 1),
    });
  });
}
