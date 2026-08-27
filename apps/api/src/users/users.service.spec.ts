import { ErrorCode } from '@lightbuy/shared';
import { QueryFailedError } from 'typeorm';
import { AppException } from '../http/app.exception';
import { USER_STATUS_ACTIVE } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const findOne = jest.fn();
  const create = jest.fn();
  const save = jest.fn();
  let service: UsersService;

  beforeEach(() => {
    findOne.mockReset();
    create.mockReset();
    save.mockReset();
    create.mockImplementation((value) => value);
    service = new UsersService({ findOne, create, save } as never);
  });

  it('findByPhone looks up by phone', async () => {
    findOne.mockResolvedValue({ id: 'u1', phone: '13800000000' });
    await expect(service.findByPhone('13800000000')).resolves.toEqual({
      id: 'u1',
      phone: '13800000000',
    });
    expect(findOne).toHaveBeenCalledWith({ where: { phone: '13800000000' } });
  });

  it('create persists an active user', async () => {
    const saved = {
      id: 'u1',
      phone: '13800000000',
      passwordHash: 'hash',
      nickname: '用户0000',
      avatar: null,
      status: USER_STATUS_ACTIVE,
    };
    save.mockResolvedValue(saved);

    await expect(
      service.create({
        phone: '13800000000',
        passwordHash: 'hash',
        nickname: '用户0000',
      }),
    ).resolves.toEqual(saved);

    expect(create).toHaveBeenCalledWith({
      phone: '13800000000',
      passwordHash: 'hash',
      nickname: '用户0000',
      avatar: null,
      status: USER_STATUS_ACTIVE,
    });
  });

  it('maps unique phone collisions to 40202', async () => {
    save.mockRejectedValue(
      new QueryFailedError('INSERT', [], {
        code: 'ER_DUP_ENTRY',
        errno: 1062,
      } as never),
    );

    try {
      await service.create({
        phone: '13800000000',
        passwordHash: 'hash',
        nickname: '用户0000',
      });
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).errorCode).toBe(ErrorCode.PHONE_TAKEN);
    }
  });
});
