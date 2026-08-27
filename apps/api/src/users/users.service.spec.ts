import { ErrorCode } from '@lightbuy/shared';
import { QueryFailedError } from 'typeorm';
import { AppException } from '../http/app.exception';
import { USER_STATUS_ACTIVE, USER_STATUS_BANNED } from './user.entity';
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

  it('getMe returns masked phone from the database row', async () => {
    findOne.mockResolvedValue({
      id: 'u1',
      phone: '13800000000',
      nickname: '用户0000',
      avatar: null,
      status: USER_STATUS_ACTIVE,
    });

    await expect(service.getMe('u1')).resolves.toEqual({
      id: 'u1',
      phoneMask: '138****0000',
      nickname: '用户0000',
      avatar: '',
    });
    expect(findOne).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('getMe treats missing or banned users as 40110', async () => {
    findOne.mockResolvedValue(null);
    try {
      await service.getMe('missing');
      fail('expected throw');
    } catch (e) {
      expect((e as AppException).errorCode).toBe(
        ErrorCode.UNAUTHORIZED_MISSING,
      );
    }

    findOne.mockResolvedValue({
      id: 'u1',
      phone: '13800000000',
      nickname: 'x',
      avatar: null,
      status: USER_STATUS_BANNED,
    });
    try {
      await service.getMe('u1');
      fail('expected throw');
    } catch (e) {
      expect((e as AppException).errorCode).toBe(
        ErrorCode.UNAUTHORIZED_MISSING,
      );
    }
  });
});
