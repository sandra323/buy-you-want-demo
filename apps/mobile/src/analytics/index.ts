import { capture } from './client';
import {
  queryLengthBucket,
  type AnalyticsCta,
  type AnalyticsProductSource,
} from './events';

export {
  getAnalyticsInitState,
  initAnalytics,
  isTelemetryEnabled,
  registerSentryNavigationContainer,
  setTelemetryEnabled,
  subscribeTelemetryState,
  syncUserIdentity,
} from './client';
export { navigationAnalytics } from './navigation';
export type { AnalyticsCta, AnalyticsProductSource } from './events';

export function trackAppLaunch(): void {
  capture('app_launch', {});
}

export function trackClick(pageName: string, elementId: AnalyticsCta): void {
  capture('click', { page_name: pageName, element_id: elementId });
}

export function trackExposure(
  moduleId: 'home_products' | 'search_results',
  productId: string,
  position: number,
): void {
  capture('exposure', {
    module_id: moduleId,
    item_ids: [productId],
    position,
  });
}

export function trackSearch(query: string, resultCount?: number): void {
  capture('search', {
    query_length_bucket: queryLengthBucket(query),
    result_count: resultCount,
  });
}

export function trackProductViewed(
  productId: string,
  from: AnalyticsProductSource = 'unknown',
): void {
  capture('view_product', { product_id: productId, from });
}

export function trackAddToCartSucceeded(
  productId: string,
  quantity: number,
): void {
  capture('add_to_cart', { product_id: productId, quantity });
}

export function trackOrderCreated(
  orderId: string,
  source: 'cart' | 'buy_now',
): void {
  capture('create_order', { order_id: orderId, source });
}

export function trackPaymentSucceeded(orderId: string): void {
  capture('pay_success', { order_id: orderId });
}

export function trackLoginSucceeded(loginType: 'password' | 'silent'): void {
  capture('login_success', { login_type: loginType });
}

export function trackLogout(): void {
  capture('logout', {});
}
