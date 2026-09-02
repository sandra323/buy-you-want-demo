import {
  ANALYTICS_EVENT_NAMES,
  FORBIDDEN_EVENT_PROPERTY_KEYS,
  queryLengthBucket,
  sanitizeEventProperties,
  type AnalyticsEventMap,
  type AnalyticsEventName,
} from './events';

const contract: {
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

const samples: { [K in AnalyticsEventName]: AnalyticsEventMap[K] } = {
  app_launch: {},
  page_view: { page_name: 'home', refer_page: 'search' },
  click: { page_name: 'login', element_id: 'login' },
  exposure: {
    module_id: 'home_products',
    item_ids: ['p1'],
    position: 1,
  },
  search: { query_length_bucket: '1-5', result_count: 12 },
  view_product: { product_id: 'p1', from: 'home' },
  add_to_cart: { product_id: 'p1', quantity: 2 },
  create_order: { order_id: 'o1', source: 'cart' },
  pay_success: { order_id: 'o1' },
  login_success: { login_type: 'password' },
  logout: {},
};

describe('analytics event contract', () => {
  it('locks the MVP event names and allowlisted properties', () => {
    expect([...ANALYTICS_EVENT_NAMES]).toEqual(Object.keys(contract));
    for (const event of ANALYTICS_EVENT_NAMES) {
      const sanitized = sanitizeEventProperties(event, samples[event]);
      expect(Object.keys(sanitized).sort()).toEqual(
        [...contract[event]].sort(),
      );
    }
  });

  it('strips PII and secrets from every event', () => {
    const leaked = Object.fromEntries(
      FORBIDDEN_EVENT_PROPERTY_KEYS.map((key) => [key, 'leaked']),
    );

    for (const event of ANALYTICS_EVENT_NAMES) {
      const sanitized = sanitizeEventProperties(event, {
        ...samples[event],
        ...leaked,
      } as AnalyticsEventMap[typeof event]);
      for (const key of FORBIDDEN_EVENT_PROPERTY_KEYS) {
        expect(sanitized).not.toHaveProperty(key);
      }
    }
  });

  it('buckets search length without returning the original query', () => {
    expect(queryLengthBucket('')).toBe('0');
    expect(queryLengthBucket('手机')).toBe('1-5');
    expect(queryLengthBucket('123456')).toBe('6-10');
    expect(queryLengthBucket('13800000000')).toBe('11+');
  });
});
