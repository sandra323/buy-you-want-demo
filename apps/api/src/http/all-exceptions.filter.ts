import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ErrorCode, type ApiResponse } from '@lightbuy/shared';
import { AppException } from './app.exception';
import { CLIENT_MESSAGE_BY_CODE } from './client-messages';
import {
  errorCodeFromHttpStatus,
  httpStatusForCode,
} from './http-status-for-code';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const { status, body } = this.toEnvelope(exception);

    httpAdapter.reply(ctx.getResponse(), body, status);
  }

  private toEnvelope(exception: unknown): {
    status: number;
    body: ApiResponse<null>;
  } {
    if (exception instanceof AppException) {
      return {
        status: httpStatusForCode(exception.errorCode),
        body: {
          code: exception.errorCode,
          message: exception.clientMessage,
          data: null,
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = isValidationHttpException(exception)
        ? ErrorCode.VALIDATION
        : errorCodeFromHttpStatus(status);

      return {
        status,
        body: {
          code,
          message: CLIENT_MESSAGE_BY_CODE[code],
          data: null,
        },
      };
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: ErrorCode.INTERNAL,
        message: CLIENT_MESSAGE_BY_CODE[ErrorCode.INTERNAL],
        data: null,
      },
    };
  }
}

function isValidationHttpException(exception: HttpException): boolean {
  if (exception.getStatus() !== HttpStatus.BAD_REQUEST) {
    return false;
  }

  const response = exception.getResponse();
  if (typeof response !== 'object' || response === null) {
    return true;
  }

  const message = (response as { message?: unknown }).message;
  return Array.isArray(message) || typeof message === 'string';
}
