import { buildCreateOrderRequest } from './create-order-request';

describe('buildCreateOrderRequest', () => {
  it('builds cart checkout without items', () => {
    expect(buildCreateOrderRequest('a1', { source: 'cart' })).toEqual({
      addressId: 'a1',
      fromCart: true,
    });
  });

  it('builds buy-now checkout without fromCart or price', () => {
    expect(
      buildCreateOrderRequest('a1', {
        source: 'buyNow',
        productId: 'p1',
        quantity: 2,
      }),
    ).toEqual({
      addressId: 'a1',
      items: [{ productId: 'p1', quantity: 2 }],
    });
  });
});
