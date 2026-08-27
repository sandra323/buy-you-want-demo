import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ErrorCode, type ApiResponse } from '@lightbuy/shared';
import { Observable, map } from 'rxjs';
import { CLIENT_MESSAGE_BY_CODE } from './client-messages';
import { isApiResponse } from './is-api-response';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (isApiResponse(data)) {
          return data;
        }
        return {
          code: ErrorCode.OK,
          message: CLIENT_MESSAGE_BY_CODE[ErrorCode.OK],
          data: data === undefined ? {} : data,
        };
      }),
    );
  }
}
