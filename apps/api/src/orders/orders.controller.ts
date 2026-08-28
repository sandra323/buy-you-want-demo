import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AccessUser } from '../auth/jwt.strategy';
import { SWAGGER_BEARER_AUTH } from '../http/setup-swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderListQueryDto } from './dto/order-query.dto';
import {
  ORDER_CONFLICT_STATE_EXAMPLE,
  ORDER_CONFLICT_STOCK_EXAMPLE,
  ORDER_DETAIL_EXAMPLE,
  ORDER_LIST_EXAMPLE,
  ORDER_NOT_FOUND_EXAMPLE,
  ORDER_UNAUTHORIZED_EXAMPLE,
} from './order-swagger.examples';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '创建待支付订单',
    description:
      'fromCart 与 items 互斥。价格与库存一律服务端计算；库存不足整单回滚。',
  })
  @ApiOkResponse({ schema: { example: ORDER_DETAIL_EXAMPLE } })
  @ApiNotFoundResponse({ schema: { example: ORDER_NOT_FOUND_EXAMPLE } })
  @ApiConflictResponse({ schema: { example: ORDER_CONFLICT_STOCK_EXAMPLE } })
  @ApiUnauthorizedResponse({ schema: { example: ORDER_UNAUTHORIZED_EXAMPLE } })
  create(@CurrentUser() user: AccessUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '订单分页列表' })
  @ApiOkResponse({ schema: { example: ORDER_LIST_EXAMPLE } })
  list(@CurrentUser() user: AccessUser, @Query() query: OrderListQueryDto) {
    return this.ordersService.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '订单详情（含快照）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { example: ORDER_DETAIL_EXAMPLE } })
  @ApiNotFoundResponse({ schema: { example: ORDER_NOT_FOUND_EXAMPLE } })
  detail(
    @CurrentUser() user: AccessUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getById(user.id, id);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '模拟支付（仅待支付）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { example: ORDER_DETAIL_EXAMPLE } })
  @ApiConflictResponse({ schema: { example: ORDER_CONFLICT_STATE_EXAMPLE } })
  @ApiNotFoundResponse({ schema: { example: ORDER_NOT_FOUND_EXAMPLE } })
  pay(@CurrentUser() user: AccessUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.pay(user.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '取消待支付订单并回库存' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { example: ORDER_DETAIL_EXAMPLE } })
  @ApiConflictResponse({ schema: { example: ORDER_CONFLICT_STATE_EXAMPLE } })
  @ApiNotFoundResponse({ schema: { example: ORDER_NOT_FOUND_EXAMPLE } })
  cancel(
    @CurrentUser() user: AccessUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.cancel(user.id, id);
  }
}
