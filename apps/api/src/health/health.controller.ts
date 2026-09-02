import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorCode } from '@lightbuy/shared';
import { Public } from '../auth/public.decorator';
import { CLIENT_MESSAGE_BY_CODE } from '../http/client-messages';
import { HealthService } from './health.service';

/** Public probe — Task 3.4 JWT guard must skip this route. */
@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '进程与数据库探活' })
  @ApiOkResponse({
    schema: {
      example: {
        code: 0,
        message: 'ok',
        data: { status: 'ok', db: 'up', uptimeSec: 12 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: '进程存活但数据库不可用',
    schema: {
      example: {
        code: ErrorCode.INTERNAL,
        message: CLIENT_MESSAGE_BY_CODE[ErrorCode.INTERNAL],
        data: { status: 'error', db: 'down', uptimeSec: 12 },
      },
    },
  })
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
