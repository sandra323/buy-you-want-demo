import { ErrorCode } from '@lightbuy/shared';
import { compare, hash } from 'bcryptjs';
import { AppException } from '../http/app.exception';
import { USER_STATUS_ACTIVE, USER_STATUS_BANNED } from '../users/user.entity';
import { AuthClock } from './auth.clock';
import {
  AuthService,
  BCRYPT_COST,
  REFRESH_REUSE_GRACE_MS,
} from './auth.service';
import { hashRefreshToken } from './refresh-token.util';

describe('AuthService', () => {
  const originalRefreshTtl = process.env.JWT_REFRESH_TTL;
  const findByPhone = jest.fn();
  const findById = jest.fn();
  const createUser = jest.fn();
  const signAsync = jest.fn();
  const createToken = jest.fn();
  const saveToken = jest.fn();
  const findToken = jest.fn();
  const updateTokens = jest.fn();
  let nowMs = Date.parse('2026-01-01T00:00:00.000Z');
  const clock: AuthClock = {
    now: () => new Date(nowMs),
  };
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
    findById.mockReset();
    createUser.mockReset();
    signAsync.mockReset();
    createToken.mockReset();
    saveToken.mockReset();
    findToken.mockReset();
    updateTokens.mockReset();
    nowMs = Date.parse('2026-01-01T00:00:00.000Z');
    createToken.mockImplementation((value) => value);
    saveToken.mockImplementation(async (row: { id?: string }) => ({
      id: row.id ?? 'rt-new',
      ...row,
    }));
    updateTokens.mockResolvedValue({ affected: 1 });
    signAsync.mockResolvedValue('access-jwt');
    activeUser.passwordHash = await hash('password123', BCRYPT_COST);
    service = new AuthService(
      { findByPhone, findById, create: createUser } as never,
      { signAsync } as never,
      {
        create: createToken,
        save: saveToken,
        findOne: findToken,
        update: updateTokens,
      } as never,
      clock,
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

  describe('refresh rotation and reuse grace', () => {
    const raw = 'ab'.repeat(64);
    const tokenHash = hashRefreshToken(raw);

    function activeRow(overrides: Record<string, unknown> = {}) {
      return {
        id: 'rt-old',
        userId: 'user-1',
        tokenHash,
        expiresAt: new Date(nowMs + 30 * 24 * 60 * 60 * 1000),
        revoked: false,
        revokedAt: null,
        replacedBy: null,
        ...overrides,
      };
    }

    it('valid refresh returns a new pair and marks the old row replaced_by', async () => {
      findToken.mockResolvedValue(activeRow());
      findById.mockResolvedValue(activeUser);
      signAsync.mockResolvedValue('access-2');

      const result = await service.refresh(raw);

      expect(result.accessToken).toBe('access-2');
      expect(result.refreshToken).toMatch(/^[0-9a-f]{128}$/);
      expect(result.refreshToken).not.toBe(raw);

      const inserted = saveToken.mock.calls[0][0] as {
        tokenHash: string;
        revoked: boolean;
      };
      expect(inserted.tokenHash).toBe(hashRefreshToken(result.refreshToken));
      expect(inserted.revoked).toBe(false);

      const revoked = saveToken.mock.calls[1][0] as {
        id: string;
        revoked: boolean;
        replacedBy: string;
        revokedAt: Date;
      };
      expect(revoked.id).toBe('rt-old');
      expect(revoked.revoked).toBe(true);
      expect(revoked.replacedBy).toBe('rt-new');
      expect(revoked.revokedAt.getTime()).toBe(nowMs);
      expect(updateTokens).not.toHaveBeenCalled();
    });

    it('reuse within 59s → 40102 and does not family-revoke', async () => {
      const revokedAt = new Date(nowMs);
      nowMs += REFRESH_REUSE_GRACE_MS - 1000;
      findToken.mockResolvedValue(
        activeRow({ revoked: true, revokedAt, replacedBy: 'rt-new' }),
      );

      await expect(service.refresh(raw)).rejects.toMatchObject({
        errorCode: ErrorCode.REFRESH_REVOKED,
      });
      expect(updateTokens).not.toHaveBeenCalled();
      expect(saveToken).not.toHaveBeenCalled();
    });

    it('reuse after 61s → 40102 and revokes all active tokens for the user', async () => {
      const revokedAt = new Date(nowMs);
      nowMs += REFRESH_REUSE_GRACE_MS + 1000;
      findToken.mockResolvedValue(
        activeRow({ revoked: true, revokedAt, replacedBy: 'rt-new' }),
      );

      await expect(service.refresh(raw)).rejects.toMatchObject({
        errorCode: ErrorCode.REFRESH_REVOKED,
      });
      expect(updateTokens).toHaveBeenCalledWith(
        { userId: 'user-1', revoked: false },
        { revoked: true, revokedAt: new Date(nowMs) },
      );
    });

    it('unknown hash → 40103', async () => {
      findToken.mockResolvedValue(null);
      await expect(service.refresh(raw)).rejects.toMatchObject({
        errorCode: ErrorCode.REFRESH_EXPIRED,
      });
    });

    it('expired unrevoked hash → 40103 without rotation', async () => {
      findToken.mockResolvedValue(
        activeRow({ expiresAt: new Date(nowMs - 1000) }),
      );
      await expect(service.refresh(raw)).rejects.toMatchObject({
        errorCode: ErrorCode.REFRESH_EXPIRED,
      });
      expect(saveToken).not.toHaveBeenCalled();
    });

    it('banned user on refresh → 40201 and does not rotate', async () => {
      findToken.mockResolvedValue(activeRow());
      findById.mockResolvedValue({
        ...activeUser,
        status: USER_STATUS_BANNED,
      });

      await expect(service.refresh(raw)).rejects.toMatchObject({
        errorCode: ErrorCode.AUTH_CREDENTIALS,
        clientMessage: '手机号或密码错误',
      });
      expect(saveToken).not.toHaveBeenCalled();
    });
  });

  it('logout revokes all active refresh rows for the user', async () => {
    await expect(service.logout('user-1')).resolves.toEqual({ ok: true });
    expect(updateTokens).toHaveBeenCalledWith(
      { userId: 'user-1', revoked: false },
      { revoked: true, revokedAt: new Date(nowMs) },
    );
  });
});
