import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@lightbuy/shared';
import { Public } from '../auth/public.decorator';
import { CLIENT_MESSAGE_BY_CODE } from '../http/client-messages';
import { HealthService } from './health.service';

/** Public probe — Task 3.4 JWT guard must skip this route. */
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async health() {
    const data = await this.healthService.check();
    if (data.db === 'down') {
      throw new HttpException(
        {
          code: ErrorCode.INTERNAL,
          message: CLIENT_MESSAGE_BY_CODE[ErrorCode.INTERNAL],
          data,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return data;
  }
}
