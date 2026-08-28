import { ErrorCode } from '@lightbuy/shared';
import {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
} from 'jsonwebtoken';
import { AppException } from '../http/app.exception';
import { throwForJwtAuthFailure } from './map-jwt-auth-failure';

describe('throwForJwtAuthFailure', () => {
  it('rethrows AppException from the strategy (banned / missing user)', () => {
    const err = new AppException(ErrorCode.UNAUTHORIZED_MISSING);
    expect(() => throwForJwtAuthFailure(err, undefined)).toThrow(err);
  });

  it('maps TokenExpiredError to 40100', () => {
    try {
      throwForJwtAuthFailure(
        undefined,
        new TokenExpiredError('jwt expired', new Date()),
      );
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).errorCode).toBe(
        ErrorCode.UNAUTHORIZED_EXPIRED,
      );
    }
  });

  it('maps malformed JWT to 40101', () => {
    try {
      throwForJwtAuthFailure(undefined, new JsonWebTokenError('jwt malformed'));
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).errorCode).toBe(
        ErrorCode.UNAUTHORIZED_INVALID,
      );
    }
  });

  it('maps NotBeforeError to 40101', () => {
    try {
      throwForJwtAuthFailure(
        undefined,
        new NotBeforeError('jwt not active', new Date()),
      );
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).errorCode).toBe(
        ErrorCode.UNAUTHORIZED_INVALID,
      );
    }
  });

  it('maps missing token to 40110', () => {
    try {
      throwForJwtAuthFailure(undefined, new Error('No auth token'));
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(AppException);
      expect((e as AppException).errorCode).toBe(
        ErrorCode.UNAUTHORIZED_MISSING,
      );
    }
  });
});
