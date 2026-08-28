import { ErrorCode, ProductSort } from '@lightbuy/shared';
import { AppException } from '../http/app.exception';
import {
  PRODUCT_STATUS_OFF,
  PRODUCT_STATUS_ON_SALE,
  Product,
} from './product.entity';
import { ProductsService } from './products.service';

function fixture(overrides: Partial<Product> = {}): Product {
  return {
    id: 'c0ffee00-0000-4000-8000-000000000001',
    name: '100% 纯棉毛巾',
    price: '19.90',
    originalPrice: '29.90',
    mainImage: 'https://example.com/a.jpg',
    images: ['https://example.com/a.jpg'],
    stock: 10,
    sales: 5,
    description: 'plain text',
    status: PRODUCT_STATUS_ON_SALE,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    cartItems: [],
    orderItems: [],
    ...overrides,
  } as Product;
}

function mockQb(result: [Product[], number]) {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(result),
  };
  return qb;
}

describe('ProductsService', () => {
  const findOne = jest.fn();
  const createQueryBuilder = jest.fn();
  let service: ProductsService;

  beforeEach(() => {
    findOne.mockReset();
    createQueryBuilder.mockReset();
    service = new ProductsService({
      findOne,
      createQueryBuilder,
    } as never);
  });

  it('lists on-sale products with comprehensive sales then createdAt order', async () => {
    const row = fixture();
    const qb = mockQb([[row], 1]);
    createQueryBuilder.mockReturnValue(qb);

    await expect(service.list({})).resolves.toEqual({
      items: [
        {
          id: row.id,
          name: row.name,
          price: 19.9,
          originalPrice: 29.9,
          mainImage: row.mainImage,
          sales: 5,
          stock: 10,
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
    });

    expect(qb.where).toHaveBeenCalledWith('p.status = :onSale', {
      onSale: PRODUCT_STATUS_ON_SALE,
    });
    expect(qb.andWhere).not.toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalledWith('p.sales', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('p.createdAt', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('p.id', 'DESC');
  });

  it('applies price_desc sort with id tie-breaker', async () => {
    const qb = mockQb([[], 0]);
    createQueryBuilder.mockReturnValue(qb);

    await service.list({ sort: ProductSort.PriceDesc, page: 2, pageSize: 5 });

    expect(qb.orderBy).toHaveBeenCalledWith('p.price', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('p.id', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
  });

  it('escapes LIKE wildcards so % is not a SQL wildcard', async () => {
    const qb = mockQb([[fixture()], 1]);
    createQueryBuilder.mockReturnValue(qb);

    await service.list({ keyword: '%' });

    expect(qb.andWhere).toHaveBeenCalledWith(`p.name LIKE :kw ESCAPE '\\\\'`, {
      kw: '%\\%%',
    });
    expect(qb.setParameter).toHaveBeenCalledWith('prefix', '\\%%');
    expect(qb.orderBy).toHaveBeenCalledWith(
      `CASE WHEN p.name LIKE :prefix ESCAPE '\\\\' THEN 0 ELSE 1 END`,
      'ASC',
    );
    expect(qb.addOrderBy).toHaveBeenCalledWith('p.sales', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('p.id', 'DESC');
  });

  it('ignores client sort when keyword is present', async () => {
    const qb = mockQb([[fixture()], 1]);
    createQueryBuilder.mockReturnValue(qb);

    await service.list({
      keyword: '毛巾',
      sort: ProductSort.PriceDesc,
    });

    expect(qb.orderBy).not.toHaveBeenCalledWith('p.price', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('p.sales', 'DESC');
  });

  it('returns recommended list with isFallback when keyword misses', async () => {
    const miss = mockQb([[], 0]);
    const rec = fixture({ id: 'rec-1', name: '陶瓷马克杯' });
    const fallback = mockQb([[rec], 22]);
    createQueryBuilder.mockReturnValueOnce(miss).mockReturnValueOnce(fallback);

    const result = await service.list({
      keyword: 'zzz-no-such',
      page: 5,
      pageSize: 10,
    });

    expect(result.isFallback).toBe(true);
    expect(result.page).toBe(1);
    expect(result.total).toBe(22);
    expect(fallback.skip).toHaveBeenCalledWith(0);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'rec-1',
        name: '陶瓷马克杯',
        isFallback: true,
      }),
    ]);
    expect(miss.andWhere).toHaveBeenCalled();
    expect(fallback.andWhere).not.toHaveBeenCalled();
  });

  it('getById returns detail for on-sale products', async () => {
    const row = fixture();
    findOne.mockResolvedValue(row);

    await expect(service.getById(row.id)).resolves.toEqual({
      id: row.id,
      name: row.name,
      price: 19.9,
      originalPrice: 29.9,
      mainImage: row.mainImage,
      sales: 5,
      stock: 10,
      images: row.images,
      description: 'plain text',
      status: 1,
    });
  });

  it('getById maps missing or off-shelf to 40401', async () => {
    findOne.mockResolvedValue(null);
    try {
      await service.getById('missing');
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).errorCode).toBe(ErrorCode.NOT_FOUND);
    }

    findOne.mockResolvedValue(fixture({ status: PRODUCT_STATUS_OFF }));
    try {
      await service.getById('off');
      fail('expected throw');
    } catch (e) {
      expect((e as AppException).errorCode).toBe(ErrorCode.NOT_FOUND);
    }
  });
});
