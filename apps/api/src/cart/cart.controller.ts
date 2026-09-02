import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
import {
  CART_NOT_FOUND_EXAMPLE,
  CART_OK_EXAMPLE,
  CART_STOCK_EXAMPLE,
  CART_UNAUTHORIZED_EXAMPLE,
} from './cart-swagger.examples';

const CART_VALIDATION_EXAMPLE = {
  code: 40001,
  message: '参数校验失败',
  data: null,
};

@ApiTags('cart')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@ApiUnauthorizedResponse({ schema: { example: CART_UNAUTHORIZED_EXAMPLE } })
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: '当前用户购物车',
    description:
      '价格/库存/名称/图从商品表现价 JOIN；下架或缺货行标记 invalid，不自动删除。',
  })
  @ApiOkResponse({ schema: { example: CART_OK_EXAMPLE } })
  @ApiUnauthorizedResponse({ schema: { example: CART_UNAUTHORIZED_EXAMPLE } })
  list(@CurrentUser() user: AccessUser) {
    return this.cartService.list(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '加购（按 user+product 唯一键累加数量）' })
  @ApiOkResponse({ schema: { example: CART_OK_EXAMPLE } })
  @ApiBadRequestResponse({ schema: { example: CART_VALIDATION_EXAMPLE } })
  @ApiNotFoundResponse({ schema: { example: CART_NOT_FOUND_EXAMPLE } })
  @ApiConflictResponse({ schema: { example: CART_STOCK_EXAMPLE } })
  @ApiUnauthorizedResponse({ schema: { example: CART_UNAUTHORIZED_EXAMPLE } })
  add(@CurrentUser() user: AccessUser, @Body() dto: AddCartItemDto) {
    return this.cartService.add(user.id, dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '改数量或选中；失效行不可加数量' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { example: CART_OK_EXAMPLE } })
  @ApiBadRequestResponse({ schema: { example: CART_VALIDATION_EXAMPLE } })
  @ApiNotFoundResponse({ schema: { example: CART_NOT_FOUND_EXAMPLE } })
  @ApiConflictResponse({ schema: { example: CART_STOCK_EXAMPLE } })
  patch(
    @CurrentUser() user: AccessUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.patch(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除自己的购物车行' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { example: CART_OK_EXAMPLE } })
  @ApiBadRequestResponse({ schema: { example: CART_VALIDATION_EXAMPLE } })
  @ApiNotFoundResponse({ schema: { example: CART_NOT_FOUND_EXAMPLE } })
  remove(
    @CurrentUser() user: AccessUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cartService.remove(user.id, id);
  }
}
