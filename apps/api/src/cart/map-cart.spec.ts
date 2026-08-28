import {
  PRODUCT_STATUS_OFF,
  PRODUCT_STATUS_ON_SALE,
} from '../products/product.entity';
import { CartItem } from './cart-item.entity';
import { toCartData } from './map-cart';

function line(
  overrides: Partial<CartItem> & {
    price?: string;
    stock?: number;
    status?: number;
  },
): CartItem {
  const {
    price = '19.90',
    stock = 10,
    status = PRODUCT_STATUS_ON_SALE,
    ...rest
  } = overrides;
  return {
    id: rest.id ?? 'line-1',
    userId: 'user-1',
    productId: rest.productId ?? 'p1',
    quantity: rest.quantity ?? 2,
    selected: rest.selected ?? true,
    product: {
      id: rest.productId ?? 'p1',
      name: '毛巾',
      price,
      mainImage: 'https://example.com/a.jpg',
      stock,
      status,
    },
  } as CartItem;
}

describe('map-cart', () => {
  it('joins live product price and flags off-shelf or zero stock as invalid', () => {
    const data = toCartData([
      line({ id: 'a', quantity: 2, price: '19.90', selected: true }),
      line({
        id: 'b',
        productId: 'p2',
        quantity: 1,
        price: '50.00',
        status: PRODUCT_STATUS_OFF,
        selected: true,
      }),
      line({
        id: 'c',
        productId: 'p3',
        quantity: 1,
        price: '10.00',
        stock: 0,
        selected: true,
      }),
    ]);

    expect(data.items[0]).toMatchObject({
      price: 19.9,
      invalid: false,
      name: '毛巾',
    });
    expect(data.items[1].invalid).toBe(true);
    expect(data.items[2].invalid).toBe(true);
    expect(data.selectedAmount).toBe(39.8);
  });
});
