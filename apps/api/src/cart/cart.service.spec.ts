import { ErrorCode } from '@lightbuy/shared';
import {
  PRODUCT_STATUS_OFF,
  PRODUCT_STATUS_ON_SALE,
  Product,
} from '../products/product.entity';
import { CartItem } from './cart-item.entity';
import { CartService } from './cart.service';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: '毛巾',
    price: '19.90',
    originalPrice: null,
    mainImage: 'https://example.com/a.jpg',
    images: [],
    stock: 10,
    sales: 0,
    description: '',
    status: PRODUCT_STATUS_ON_SALE,
    ...overrides,
  } as Product;
}

function qbGetOne(value: unknown) {
  return {
    setLock: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(value),
  };
}

describe('CartService', () => {
  const find = jest.fn();
  const del = jest.fn();
  const save = jest.fn();
  const create = jest.fn((_cls: unknown, value: unknown) => value);
  let createQueryBuilder: jest.Mock;
  let service: CartService;

  beforeEach(() => {
    find.mockReset();
    del.mockReset();
    save.mockReset();
    createQueryBuilder = jest.fn();
    const em = {
      createQueryBuilder,
      create,
      save,
    };
    service = new CartService(
      { find, delete: del } as never,
      {
        transaction: async (fn: (manager: typeof em) => Promise<void>) =>
          fn(em),
      } as never,
    );
  });

  it('lists joined lines from the current user only', async () => {
    find.mockResolvedValue([]);
    await service.list('user-1');
    expect(find).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      relations: { product: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  });

  it('rejects add when product is off-shelf with 40401', async () => {
    createQueryBuilder.mockReturnValueOnce(
      qbGetOne(product({ status: PRODUCT_STATUS_OFF })),
    );

    await expect(
      service.add('user-1', { productId: 'p1', quantity: 1 }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND });
  });

  it('rejects add when quantity exceeds stock with 40901', async () => {
    createQueryBuilder
      .mockReturnValueOnce(qbGetOne(product({ stock: 2 })))
      .mockReturnValueOnce(qbGetOne(null));

    await expect(
      service.add('user-1', { productId: 'p1', quantity: 3 }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.CONFLICT_STOCK });
  });

  it('upserts by adding onto the existing line quantity', async () => {
    const existing = {
      id: 'line-1',
      userId: 'user-1',
      productId: 'p1',
      quantity: 2,
      selected: true,
    };
    createQueryBuilder
      .mockReturnValueOnce(qbGetOne(product({ stock: 10 })))
      .mockReturnValueOnce(qbGetOne(existing));
    find.mockResolvedValue([]);

    await service.add('user-1', { productId: 'p1', quantity: 3 });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 5 }));
  });

  it('does not raise quantity on an invalid line', async () => {
    const line = {
      id: 'line-1',
      userId: 'user-1',
      productId: 'p1',
      quantity: 1,
      selected: true,
      product: product({ stock: 0 }),
    } as CartItem;
    createQueryBuilder.mockReturnValueOnce(qbGetOne(line));

    await expect(
      service.patch('user-1', 'line-1', { quantity: 2 }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.CONFLICT_STOCK });
  });

  it('maps missing line id for this user to 40401', async () => {
    createQueryBuilder.mockReturnValueOnce(qbGetOne(null));
    await expect(
      service.patch('user-1', 'line-other', { quantity: 1 }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND });

    del.mockResolvedValue({ affected: 0 });
    await expect(service.remove('user-1', 'line-other')).rejects.toMatchObject({
      errorCode: ErrorCode.NOT_FOUND,
    });
  });
});
