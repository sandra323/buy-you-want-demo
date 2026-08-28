import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { ProductsQueryDto } from './dto/catalog-query.dto';
import {
  CATALOG_DETAIL_EXAMPLE,
  CATALOG_FALLBACK_EXAMPLE,
  CATALOG_LIST_EXAMPLE,
  CATALOG_NOT_FOUND_EXAMPLE,
} from './catalog-swagger.examples';
import { ProductsService } from './products.service';

@Public()
@ApiTags('catalog')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: '在售商品列表',
    description:
      '支持 sort / page / pageSize / keyword。无命中时返回综合推荐，data.isFallback 为 true。',
  })
  @ApiOkResponse({
    description: '分页卡片；空搜兜底时带 isFallback',
    schema: {
      example: CATALOG_LIST_EXAMPLE,
      oneOf: [
        { example: CATALOG_LIST_EXAMPLE },
        { example: CATALOG_FALLBACK_EXAMPLE },
      ],
    },
  })
  list(@Query() query: ProductsQueryDto) {
    return this.productsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '在售商品详情（下架或缺失为 40401）' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({
    description: '卡片字段 + images / description / status',
    schema: { example: CATALOG_DETAIL_EXAMPLE },
  })
  @ApiNotFoundResponse({
    description: '不存在或已下架',
    schema: { example: CATALOG_NOT_FOUND_EXAMPLE },
  })
  detail(@Param('id') id: string) {
    return this.productsService.getById(id);
  }
}
