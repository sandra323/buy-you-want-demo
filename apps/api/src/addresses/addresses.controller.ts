import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { AddressesService } from './addresses.service';
import { AddressInputDto } from './dto/address.dto';

const ADDRESS_EXAMPLE = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  receiverName: '张三',
  phone: '13800000000',
  province: '上海市',
  city: '上海市',
  district: '浦东新区',
  detail: '示例路 1 号',
  isDefault: true,
};

const UNAUTHORIZED_EXAMPLE = {
  code: 40110,
  message: '未登录',
  data: null,
};

const NOT_FOUND_EXAMPLE = {
  code: 40401,
  message: '资源不存在',
  data: null,
};

@ApiTags('addresses')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: '地址列表（默认地址在前）' })
  @ApiOkResponse({
    schema: {
      example: { code: 0, message: 'ok', data: [ADDRESS_EXAMPLE] },
    },
  })
  @ApiUnauthorizedResponse({ schema: { example: UNAUTHORIZED_EXAMPLE } })
  list(@CurrentUser() user: AccessUser) {
    return this.addressesService.list(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '新增地址；第一份自动设为默认' })
  @ApiOkResponse({
    schema: { example: { code: 0, message: 'ok', data: ADDRESS_EXAMPLE } },
  })
  create(@CurrentUser() user: AccessUser, @Body() dto: AddressInputDto) {
    return this.addressesService.create(user.id, dto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新地址；设默认时事务内取消其他默认' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    schema: { example: { code: 0, message: 'ok', data: ADDRESS_EXAMPLE } },
  })
  @ApiNotFoundResponse({ schema: { example: NOT_FOUND_EXAMPLE } })
  update(
    @CurrentUser() user: AccessUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddressInputDto,
  ) {
    return this.addressesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除地址；若删的是默认则提升最近一条' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    schema: { example: { code: 0, message: 'ok', data: { ok: true } } },
  })
  @ApiNotFoundResponse({ schema: { example: NOT_FOUND_EXAMPLE } })
  remove(
    @CurrentUser() user: AccessUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addressesService.remove(user.id, id);
  }
}
