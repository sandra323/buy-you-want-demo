import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  it('forwards the JWT user id on create/list/detail', async () => {
    const create = jest.fn();
    const list = jest.fn();
    const getById = jest.fn();
    const controller = new OrdersController({
      create,
      list,
      getById,
      pay: jest.fn(),
      cancel: jest.fn(),
    } as unknown as OrdersService);

    await controller.create({ id: 'u1' }, {
      addressId: 'a1',
      fromCart: true,
    } as never);
    await controller.list({ id: 'u1' }, { page: 1 });
    await controller.detail({ id: 'u1' }, 'o1');

    expect(create).toHaveBeenCalledWith('u1', expect.any(Object));
    expect(list).toHaveBeenCalledWith('u1', { page: 1 });
    expect(getById).toHaveBeenCalledWith('u1', 'o1');
  });
});
