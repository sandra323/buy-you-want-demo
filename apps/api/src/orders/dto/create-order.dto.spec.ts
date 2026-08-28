import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderDto } from './create-order.dto';
import { OrderListQueryDto } from './order-query.dto';

const ADDRESS = 'c0ffee00-0000-4000-8000-00000000a001';
const PRODUCT = 'c0ffee00-0000-4000-8000-000000000001';

describe('order DTOs', () => {
  it('accepts fromCart XOR items', async () => {
    const cart = plainToInstance(CreateOrderDto, {
      addressId: ADDRESS,
      fromCart: true,
    });
    const buyNow = plainToInstance(CreateOrderDto, {
      addressId: ADDRESS,
      items: [{ productId: PRODUCT, quantity: 1 }],
    });
    await expect(validate(cart)).resolves.toHaveLength(0);
    await expect(validate(buyNow)).resolves.toHaveLength(0);
  });

  it('rejects both or neither line sources', async () => {
    const both = await validate(
      plainToInstance(CreateOrderDto, {
        addressId: ADDRESS,
        fromCart: true,
        items: [{ productId: PRODUCT, quantity: 1 }],
      }),
    );
    const neither = await validate(
      plainToInstance(CreateOrderDto, { addressId: ADDRESS }),
    );
    expect(both.length).toBeGreaterThan(0);
    expect(neither.length).toBeGreaterThan(0);
  });

  it('rejects pageSize above 50', async () => {
    const errors = await validate(
      plainToInstance(OrderListQueryDto, { pageSize: '51' }),
    );
    expect(errors.some((e) => e.property === 'pageSize')).toBe(true);
  });

  it('treats status=all as omitted', async () => {
    const dto = plainToInstance(OrderListQueryDto, { status: 'all' });
    expect(dto.status).toBeUndefined();
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
