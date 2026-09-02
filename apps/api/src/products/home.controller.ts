import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { HomeQueryDto } from './dto/catalog-query.dto';
import { CATALOG_LIST_EXAMPLE } from './catalog-swagger.examples';
import { ProductsService } from './products.service';

@Public()
@ApiTags('catalog')
@Controller('home')
export class HomeController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: '首页在售商品列表（无 keyword）' })
  @ApiOkResponse({
    description: '业务 envelope，data 为分页商品卡片',
    schema: { example: CATALOG_LIST_EXAMPLE },
  })
  @ApiBadRequestResponse({
    schema: {
      example: { code: 40001, message: '参数校验失败', data: null },
    },
  })
  list(@Query() query: HomeQueryDto) {
    return this.productsService.list(query);
  }
}
