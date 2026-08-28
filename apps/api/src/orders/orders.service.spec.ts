import { ErrorCode } from '@lightbuy/shared';
import { AppException } from '../http/app.exception';
import { OrdersService } from './orders.service';

describe('OrdersService IDOR and state guards', () => {
  const exists = jest.fn();
  const findOne = jest.fn();
  let service: OrdersService;

  beforeEach(() => {
    exists.mockReset();
    findOne.mockReset();
    service = new OrdersService(
      { exists, findOne, createQueryBuilder: jest.fn() } as never,
      { find: jest.fn() } as never,
      { transaction: jest.fn() } as never,
    );
  });

  it('maps missing owned order to 40401', async () => {
    findOne.mockResolvedValue(null);
    await expect(service.getById('u1', 'o-other')).rejects.toMatchObject({
      errorCode: ErrorCode.NOT_FOUND,
    });
  });

  it('pay/cancel of another users order is 40401 before state checks', async () => {
    exists.mockResolvedValue(false);
    await expect(service.pay('u1', 'o-other')).rejects.toBeInstanceOf(
      AppException,
    );
    await expect(service.pay('u1', 'o-other')).rejects.toMatchObject({
      errorCode: ErrorCode.NOT_FOUND,
    });
    await expect(service.cancel('u1', 'o-other')).rejects.toMatchObject({
      errorCode: ErrorCode.NOT_FOUND,
    });
  });
});
