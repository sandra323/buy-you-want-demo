import { ErrorCode } from '@lightbuy/shared';
import { AppException } from '../http/app.exception';
import { USER_STATUS_ACTIVE, USER_STATUS_BANNED } from '../users/user.entity';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const originalSecret = process.env.JWT_SECRET;
  const findOne = jest.fn();
  let strategy: JwtStrategy;

  beforeAll(() => {
    process.env.JWT_SECRET = 'unit-test-jwt-secret-not-for-production!!';
    strategy = new JwtStrategy({ findOne } as never);
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  beforeEach(() => {
    findOne.mockReset();
  });

  it('returns { id } for an active user', async () => {
    findOne.mockResolvedValue({ id: 'user-1', status: USER_STATUS_ACTIVE });
    await expect(strategy.validate({ sub: 'user-1' })).resolves.toEqual({
      id: 'user-1',
    });
  });

  it('maps banned status to 40110 (not 40301)', async () => {
    findOne.mockResolvedValue({ id: 'user-1', status: USER_STATUS_BANNED });
    try {
      await strategy.validate({ sub: 'user-1' });
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).errorCode).toBe(
        ErrorCode.UNAUTHORIZED_MISSING,
      );
      expect((e as AppException).errorCode).not.toBe(
        ErrorCode.FORBIDDEN_RESERVED,
      );
    }
  });

  it('maps unknown user to 40110', async () => {
    findOne.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'missing' })).rejects.toMatchObject({
      errorCode: ErrorCode.UNAUTHORIZED_MISSING,
    });
  });

  it('maps missing sub to 40101', async () => {
    await expect(strategy.validate({} as never)).rejects.toMatchObject({
      errorCode: ErrorCode.UNAUTHORIZED_INVALID,
    });
  });
});
