import { PRODUCT_STATUS_ON_SALE, Product } from './product.entity';
import { toProductCard, toProductDetail } from './map-product';

function fixture(overrides: Partial<Product> = {}): Product {
  return {
    id: 'c0ffee00-0000-4000-8000-000000000001',
    name: '100% 纯棉毛巾',
    price: '19.90',
    originalPrice: '29.90',
    mainImage: 'https://picsum.photos/id/10/400/400',
    images: [
      'https://picsum.photos/id/10/400/400',
      'https://picsum.photos/id/11/600/600',
    ],
    stock: 120,
    sales: 840,
    description: '柔软吸水',
    status: PRODUCT_STATUS_ON_SALE,
    createdAt: new Date('2024-01-05T02:00:00.000Z'),
    updatedAt: new Date('2024-01-05T02:00:00.000Z'),
    cartItems: [],
    orderItems: [],
    ...overrides,
  } as Product;
}

describe('map-product', () => {
  it('maps decimal strings to numbers on the shared card shape', () => {
    expect(toProductCard(fixture())).toEqual({
      id: 'c0ffee00-0000-4000-8000-000000000001',
      name: '100% 纯棉毛巾',
      price: 19.9,
      originalPrice: 29.9,
      mainImage: 'https://picsum.photos/id/10/400/400',
      sales: 840,
      stock: 120,
    });
  });

  it('omits isFallback unless substituting recommendations', () => {
    expect(toProductCard(fixture()).isFallback).toBeUndefined();
    expect(toProductCard(fixture(), { isFallback: true }).isFallback).toBe(
      true,
    );
  });

  it('maps detail as card plus images, plain-text description, and status', () => {
    expect(toProductDetail(fixture({ originalPrice: null }))).toEqual({
      id: 'c0ffee00-0000-4000-8000-000000000001',
      name: '100% 纯棉毛巾',
      price: 19.9,
      originalPrice: null,
      mainImage: 'https://picsum.photos/id/10/400/400',
      sales: 840,
      stock: 120,
      images: [
        'https://picsum.photos/id/10/400/400',
        'https://picsum.photos/id/11/600/600',
      ],
      description: '柔软吸水',
      status: 1,
    });
  });
});
