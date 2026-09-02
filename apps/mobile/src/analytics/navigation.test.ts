import type { NavigationState } from '@react-navigation/native';

import {
  getDeepestActiveRoute,
  NavigationAnalyticsTracker,
} from './navigation';

describe('navigation analytics', () => {
  it('resolves the deepest active tab route', () => {
    const state = {
      index: 0,
      routes: [
        {
          key: 'main',
          name: 'MainTabs',
          state: {
            index: 1,
            routes: [
              { key: 'home', name: 'Home' },
              { key: 'cart', name: 'Cart' },
            ],
          },
        },
      ],
    } as unknown as NavigationState;

    expect(getDeepestActiveRoute(state)?.name).toBe('Cart');
  });

  it('deduplicates identical state but tracks tabs and changed detail ids', () => {
    const capturePageView = jest.fn(() => true);
    const tracker = new NavigationAnalyticsTracker(capturePageView);
    const home = { key: 'home', name: 'Home' };
    const productA = {
      key: 'product',
      name: 'ProductDetail',
      params: { productId: 'a' },
    };
    const productB = {
      key: 'product',
      name: 'ProductDetail',
      params: { productId: 'b' },
    };

    expect(tracker.track(home)).toBe(true);
    expect(tracker.track(home)).toBe(false);
    expect(tracker.track(productA)).toBe(true);
    expect(tracker.track(productB)).toBe(true);
    expect(tracker.track(home)).toBe(true);

    expect(capturePageView).toHaveBeenCalledTimes(4);
    expect(capturePageView).toHaveBeenLastCalledWith('page_view', {
      page_name: 'home',
      refer_page: 'product_detail',
    });
  });
});
