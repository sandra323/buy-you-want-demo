import { ErrorCode } from '@lightbuy/shared';
import { compare, hash } from 'bcryptjs';
import { AppException } from '../http/app.exception';
import { USER_STATUS_ACTIVE, USER_STATUS_BANNED } from '../users/user.entity';
import { AuthService, BCRYPT_COST } from './auth.service';
import { hashRefreshToken } from './refresh-token.util';

describe('AuthService', () => {
  const originalRefreshTtl = process.env.JWT_REFRESH_TTL;
  const findByPhone = jest.fn();
  const createUser = jest.fn();
  const signAsync = jest.fn();
  const createToken = jest.fn();
  const saveToken = jest.fn();
  let service: AuthService;

  const activeUser = {
    id: 'user-1',
    phone: '13800000000',
    passwordHash: '',
    nickname: '用户0000',
    avatar: null,
    status: USER_STATUS_ACTIVE,
  };

  beforeAll(() => {
    process.env.JWT_REFRESH_TTL = '30d';
  });

  afterAll(() => {
    if (originalRefreshTtl === undefined) {
      delete process.env.JWT_REFRESH_TTL;
    } else {
      process.env.JWT_REFRESH_TTL = originalRefreshTtl;
    }
  });

  beforeEach(async () => {
    findByPhone.mockReset();
    createUser.mockReset();
    signAsync.mockReset();
    createToken.mockReset();
    saveToken.mockReset();
    createToken.mockImplementation((value) => value);
    saveToken.mockResolvedValue(undefined);
    signAsync.mockResolvedValue('access-jwt');
    activeUser.passwordHash = await hash('password123', BCRYPT_COST);
    service = new AuthService(
      { findByPhone, create: createUser } as never,
      { signAsync } as never,
      { create: createToken, save: saveToken } as never,
    );
  });

  it('register hashes the password, stores only sha256(refresh), returns tokens + masked user', async () => {
    findByPhone.mockResolvedValue(null);
    createUser.mockImplementation(async (input: { passwordHash: string }) => ({
      ...activeUser,
      passwordHash: input.passwordHash,
    }));

    const result = await service.register({
      phone: '13800000000',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(result.accessToken).toBe('access-jwt');
    expect(result.refreshToken).toMatch(/^[0-9a-f]{128}$/);
    expect(result.user).toEqual({
      id: 'user-1',
      phoneMask: '138****0000',
      nickname: '用户0000',
      avatar: '',
    });

    const savedHash = createUser.mock.calls[0][0].passwordHash as string;
    expect(savedHash).not.toBe('password123');
    await expect(compare('password123', savedHash)).resolves.toBe(true);

    const savedRow = saveToken.mock.calls[0][0] as {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    };
    expect(savedRow.userId).toBe('user-1');
    expect(savedRow.tokenHash).toBe(hashRefreshToken(result.refreshToken));
    expect(savedRow.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(savedRow.tokenHash).not.toBe(result.refreshToken);
    expect(signAsync).toHaveBeenCalledWith({ sub: 'user-1' });
  });

  it('register duplicate phone → 40202', async () => {
    findByPhone.mockResolvedValue(activeUser);

    try {
      await service.register({
        phone: '13800000000',
        password: 'password123',
        confirmPassword: 'password123',
      });
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).errorCode).toBe(ErrorCode.PHONE_TAKEN);
      expect((e as AppException).clientMessage).toBe('手机号已注册');
    }
    expect(createUser).not.toHaveBeenCalled();
  });

  it('login returns the same payload shape as register', async () => {
    findByPhone.mockResolvedValue(activeUser);

    const result = await service.login({
      phone: '13800000000',
      password: 'password123',
    });

    expect(result.accessToken).toBe('access-jwt');
    expect(result.refreshToken).toHaveLength(128);
    expect(result.user.phoneMask).toBe('138****0000');
  });

  it('wrong password → 40201 with exact copy', async () => {
    findByPhone.mockResolvedValue(activeUser);

    try {
      await service.login({
        phone: '13800000000',
        password: 'wrongpwd',
      });
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).errorCode).toBe(ErrorCode.AUTH_CREDENTIALS);
      expect((e as AppException).clientMessage).toBe('手机号或密码错误');
      expect((e as AppException).getStatus()).toBe(400);
    }
  });

  it('unknown phone uses the same 40201 copy (never user-not-found)', async () => {
    findByPhone.mockResolvedValue(null);

    await expect(
      service.login({ phone: '13900000000', password: 'password123' }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.AUTH_CREDENTIALS,
      clientMessage: '手机号或密码错误',
    });
  });

  it('banned user login → 40201', async () => {
    findByPhone.mockResolvedValue({
      ...activeUser,
      status: USER_STATUS_BANNED,
    });

    await expect(
      service.login({ phone: '13800000000', password: 'password123' }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.AUTH_CREDENTIALS });
    expect(saveToken).not.toHaveBeenCalled();
  });
});
