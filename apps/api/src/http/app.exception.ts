import { HttpException } from '@nestjs/common';
import { ErrorCode } from '@lightbuy/shared';
import { CLIENT_MESSAGE_BY_CODE } from './client-messages';
import { httpStatusForCode } from './http-status-for-code';

/** Domain error that the global filter maps to `{ code, message, data: null }`. */
export class AppException extends HttpException {
  readonly errorCode: ErrorCode;
  readonly clientMessage: string;

  constructor(code: ErrorCode, message?: string) {
    const clientMessage = message ?? CLIENT_MESSAGE_BY_CODE[code];
    super(
      { code, message: clientMessage, data: null },
      httpStatusForCode(code),
    );
    this.errorCode = code;
    this.clientMessage = clientMessage;
  }
}
