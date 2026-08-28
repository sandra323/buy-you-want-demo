import { ProductSort } from '@lightbuy/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HomeQueryDto, ProductsQueryDto } from './catalog-query.dto';

describe('catalog query DTOs', () => {
  it('accepts omitted pagination and sort', async () => {
    const dto = plainToInstance(HomeQueryDto, {});
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts ProductSort enum values', async () => {
    const dto = plainToInstance(HomeQueryDto, {
      sort: ProductSort.PriceAsc,
      page: '2',
      pageSize: '20',
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(20);
    expect(dto.sort).toBe(ProductSort.PriceAsc);
  });

  it('rejects unknown sort and pageSize above 50', async () => {
    const sort = await validate(
      plainToInstance(HomeQueryDto, { sort: 'popular' }),
    );
    const pageSize = await validate(
      plainToInstance(HomeQueryDto, { pageSize: '51' }),
    );
    expect(sort.some((e) => e.property === 'sort')).toBe(true);
    expect(pageSize.some((e) => e.property === 'pageSize')).toBe(true);
  });

  it('trims keyword, treats blank as omitted, and caps length at 40', async () => {
    const blank = plainToInstance(ProductsQueryDto, { keyword: '   ' });
    expect(blank.keyword).toBeUndefined();
    await expect(validate(blank)).resolves.toHaveLength(0);

    const trimmed = plainToInstance(ProductsQueryDto, { keyword: ' 毛巾 ' });
    expect(trimmed.keyword).toBe('毛巾');

    const tooLong = plainToInstance(ProductsQueryDto, {
      keyword: 'x'.repeat(41),
    });
    const errors = await validate(tooLong);
    expect(errors.some((e) => e.property === 'keyword')).toBe(true);
  });
});
