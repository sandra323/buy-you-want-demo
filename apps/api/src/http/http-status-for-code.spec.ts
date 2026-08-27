import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@lightbuy/shared';
import {
  errorCodeFromHttpStatus,
  httpStatusForCode,
} from './http-status-for-code';

describe('httpStatusForCode', () => {
  it('maps success and the Task 3.1 codes', () => {
    expect(httpStatusForCode(ErrorCode.OK)).toBe(HttpStatus.OK);
    expect(httpStatusForCode(ErrorCode.VALIDATION)).toBe(
      HttpStatus.BAD_REQUEST,
    );
    expect(httpStatusForCode(ErrorCode.INTERNAL)).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });
});

describe('errorCodeFromHttpStatus', () => {
  it('maps Nest/guard HTTP statuses for later JWT and throttler', () => {
    expect(errorCodeFromHttpStatus(HttpStatus.BAD_REQUEST)).toBe(
      ErrorCode.VALIDATION,
    );
    expect(errorCodeFromHttpStatus(HttpStatus.UNAUTHORIZED)).toBe(
      ErrorCode.UNAUTHORIZED_MISSING,
    );
    expect(errorCodeFromHttpStatus(HttpStatus.TOO_MANY_REQUESTS)).toBe(
      ErrorCode.RATE_LIMITED,
    );
    expect(errorCodeFromHttpStatus(HttpStatus.NOT_FOUND)).toBe(
      ErrorCode.NOT_FOUND,
    );
  });
});
