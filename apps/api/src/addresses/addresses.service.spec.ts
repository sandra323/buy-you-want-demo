import { ErrorCode } from '@lightbuy/shared';
import { Address } from './address.entity';
import { AddressesService } from './addresses.service';

function addr(overrides: Partial<Address> = {}): Address {
  return {
    id: 'a1',
    userId: 'u1',
    receiverName: '甲',
    phone: '13800000000',
    province: '沪',
    city: '沪',
    district: '浦东',
    detail: '1 号',
    isDefault: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as Address;
}

describe('AddressesService', () => {
  const find = jest.fn();
  const getMany = jest.fn();
  const save = jest.fn(async (row: Address) => row);
  const del = jest.fn();
  const create = jest.fn((_cls: unknown, value: Address) => value);
  const findOneByOrFail = jest.fn();
  let service: AddressesService;

  beforeEach(() => {
    find.mockReset();
    getMany.mockReset();
    del.mockReset();
    findOneByOrFail.mockReset();
    const em = {
      createQueryBuilder: () => ({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany,
      }),
      create,
      save,
      delete: del,
      findOneByOrFail,
    };
    service = new AddressesService(
      { find } as never,
      {
        transaction: async (fn: (manager: typeof em) => Promise<unknown>) =>
          fn(em),
      } as never,
    );
  });

  it('lists default addresses first', async () => {
    find.mockResolvedValue([]);
    await service.list('u1');
    expect(find).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      order: { isDefault: 'DESC', createdAt: 'DESC', id: 'DESC' },
    });
  });

  it('forces the first address to be default', async () => {
    getMany.mockResolvedValue([]);
    const created = await service.create('u1', {
      receiverName: '甲',
      phone: '13800000000',
      province: '沪',
      city: '沪',
      district: '浦东',
      detail: '1 号',
      isDefault: false,
    });
    expect(created.isDefault).toBe(true);
  });

  it('unsets other defaults atomically when setting a new one', async () => {
    const first = addr({ id: 'a1', isDefault: true });
    const second = addr({
      id: 'a2',
      isDefault: false,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    getMany.mockResolvedValue([first, second]);
    findOneByOrFail.mockResolvedValue({ ...second, isDefault: true });

    await service.update('u1', 'a2', {
      receiverName: '乙',
      phone: '13800000001',
      province: '沪',
      city: '沪',
      district: '浦东',
      detail: '2 号',
      isDefault: true,
    });

    expect(first.isDefault).toBe(false);
    expect(second.isDefault).toBe(true);
  });

  it('promotes the latest remaining row when deleting the default', async () => {
    const older = addr({
      id: 'a1',
      isDefault: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const newer = addr({
      id: 'a2',
      isDefault: false,
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
    });
    const current = addr({ id: 'a0', isDefault: true });
    getMany
      .mockResolvedValueOnce([older, newer, current])
      .mockResolvedValueOnce([older, newer]);

    await service.remove('u1', 'a0');
    expect(del).toHaveBeenCalledWith(Address, { id: 'a0', userId: 'u1' });
    expect(newer.isDefault).toBe(true);
    expect(older.isDefault).toBe(false);
  });

  it('maps other users address ids to 40401', async () => {
    getMany.mockResolvedValue([addr({ id: 'mine' })]);
    await expect(
      service.update('u1', 'not-mine', {
        receiverName: '甲',
        phone: '13800000000',
        province: '沪',
        city: '沪',
        district: '浦东',
        detail: '1 号',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.NOT_FOUND });
  });
});
