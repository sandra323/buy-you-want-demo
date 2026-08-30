import type { CartItem } from '@lightbuy/shared';

import { cartBadgeCount } from './cart-badge-count';

const item = (quantity: number): CartItem => ({
  id: `line-${quantity}`,
  productId: `product-${quantity}`,
  name: '商品',
  image: '',
  price: 10,
  quantity,
  selected: true,
  stock: 99,
  invalid: false,
});

describe('cartBadgeCount', () => {
  it('counts server quantities rather than local row count', () => {
    expect(cartBadgeCount([item(2), item(3)])).toBe(5);
  });
});
