import type { NavigationState, PartialState } from '@react-navigation/native';

import { capture } from './client';

type RouteLike = {
  key?: string;
  name: string;
  params?: unknown;
  state?: NavigationState | PartialState<NavigationState>;
};

const pageNames: Record<string, string> = {
  Home: 'home',
  Cart: 'cart',
  Me: 'me',
  Search: 'search',
  ProductDetail: 'product_detail',
  Checkout: 'checkout',
  OrderList: 'order_list',
  OrderDetail: 'order_detail',
  AddressList: 'address_list',
  AddressEdit: 'address_edit',
  Login: 'login',
  Register: 'register',
  Settings: 'settings',
  UiKitPreview: 'ui_kit_preview',
};

function paramFingerprint(route: RouteLike): string {
  if (!route.params || typeof route.params !== 'object') return '';
  const params = route.params as Record<string, unknown>;
  return ['productId', 'orderId', 'addressId', 'source']
    .map((key) => `${key}:${String(params[key] ?? '')}`)
    .join('|');
}

export function getDeepestActiveRoute(
  state: NavigationState | PartialState<NavigationState>,
): RouteLike | undefined {
  const route = state.routes[state.index ?? 0] as RouteLike | undefined;
  if (!route) return undefined;
  return route.state ? getDeepestActiveRoute(route.state) : route;
}

export class NavigationAnalyticsTracker {
  private previousFingerprint: string | null = null;
  private previousPage: string | undefined;

  constructor(private readonly capturePageView: typeof capture = capture) {}

  track(route: RouteLike | undefined): boolean {
    if (!route) return false;
    const pageName = pageNames[route.name] ?? route.name;
    const fingerprint = `${route.name}|${route.key ?? ''}|${paramFingerprint(route)}`;
    if (fingerprint === this.previousFingerprint) return false;

    const captured = this.capturePageView('page_view', {
      page_name: pageName,
      refer_page: this.previousPage,
    });
    if (captured) {
      this.previousFingerprint = fingerprint;
      this.previousPage = pageName;
    }
    return captured;
  }

  reset(): void {
    this.previousFingerprint = null;
    this.previousPage = undefined;
  }
}

export const navigationAnalytics = new NavigationAnalyticsTracker();
