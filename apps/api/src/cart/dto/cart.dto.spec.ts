import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddCartItemDto, UpdateCartItemDto } from './cart.dto';

describe('cart DTOs', () => {
  it('accepts a valid add payload', async () => {
    const dto = plainToInstance(AddCartItemDto, {
      productId: 'c0ffee00-0000-4000-8000-000000000001',
      quantity: 2,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects quantity outside 1–99 and non-uuid productId', async () => {
    const qty = await validate(
      plainToInstance(AddCartItemDto, {
        productId: 'c0ffee00-0000-4000-8000-000000000001',
        quantity: 100,
      }),
    );
    const id = await validate(
      plainToInstance(AddCartItemDto, { productId: 'p1', quantity: 1 }),
    );
    expect(qty.some((e) => e.property === 'quantity')).toBe(true);
    expect(id.some((e) => e.property === 'productId')).toBe(true);
  });

  it('allows patching selected without quantity', async () => {
    const dto = plainToInstance(UpdateCartItemDto, { selected: false });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
