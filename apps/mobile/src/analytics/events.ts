export type AnalyticsEventMap = {
  app_launch: Record<string, never>;
  page_view: { page_name: string; refer_page?: string };
  click: { page_name: string; element_id: AnalyticsCta };
  exposure: {
    module_id: 'home_products' | 'search_results';
    item_ids: string[];
    position: number;
  };
  search: {
    query_length_bucket: '0' | '1-5' | '6-10' | '11+';
    result_count?: number;
  };
  view_product: { product_id: string; from?: AnalyticsProductSource };
  add_to_cart: { product_id: string; quantity: number };
  create_order: { order_id: string; source: 'cart' | 'buy_now' };
  pay_success: { order_id: string };
  login_success: { login_type: 'password' | 'silent' };
  logout: Record<string, never>;
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
export const ANALYTICS_EVENT_NAMES = [
  'app_launch',
  'page_view',
  'click',
  'exposure',
  'search',
  'view_product',
  'add_to_cart',
  'create_order',
  'pay_success',
  'login_success',
  'logout',
] as const satisfies readonly AnalyticsEventName[];

export const FORBIDDEN_EVENT_PROPERTY_KEYS = [
  'phone',
  'address',
  'receiver',
  'token',
  'password',
  'keyword',
  'accessToken',
  'refreshToken',
] as const;

export type AnalyticsCta =
  | 'search_submit'
  | 'add_to_cart'
  | 'buy_now'
  | 'checkout'
  | 'pay'
  | 'login'
  | 'register'
  | 'logout';
export type AnalyticsProductSource = 'home' | 'search' | 'cart' | 'unknown';

const allowedProperties: {
  [K in AnalyticsEventName]: readonly (keyof AnalyticsEventMap[K])[];
} = {
  app_launch: [],
  page_view: ['page_name', 'refer_page'],
  click: ['page_name', 'element_id'],
  exposure: ['module_id', 'item_ids', 'position'],
  search: ['query_length_bucket', 'result_count'],
  view_product: ['product_id', 'from'],
  add_to_cart: ['product_id', 'quantity'],
  create_order: ['order_id', 'source'],
  pay_success: ['order_id'],
  login_success: ['login_type'],
  logout: [],
};

export function sanitizeEventProperties<K extends AnalyticsEventName>(
  event: K,
  properties: AnalyticsEventMap[K],
): AnalyticsEventMap[K] {
  const input = properties as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of allowedProperties[event] as readonly string[]) {
    const value = input[key];
    if (value !== undefined) {
      output[key] = value;
    }
  }
  return output as AnalyticsEventMap[K];
}

export function queryLengthBucket(
  query: string,
): AnalyticsEventMap['search']['query_length_bucket'] {
  const length = query.trim().length;
  if (length === 0) return '0';
  if (length <= 5) return '1-5';
  if (length <= 10) return '6-10';
  return '11+';
}
