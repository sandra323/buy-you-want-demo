import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PAGINATION_DEFAULT_PAGE,
  PAGINATION_DEFAULT_PAGE_SIZE,
  PAGINATION_MAX_PAGE_SIZE,
  ProductSort,
} from '@lightbuy/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class HomeQueryDto {
  @ApiPropertyOptional({
    enum: ProductSort,
    enumName: 'ProductSort',
    default: ProductSort.Comprehensive,
  })
  @IsOptional()
  @IsEnum(ProductSort)
  sort?: ProductSort;

  @ApiPropertyOptional({
    default: PAGINATION_DEFAULT_PAGE,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    default: PAGINATION_DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: PAGINATION_MAX_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_PAGE_SIZE)
  pageSize?: number;
}

export class ProductsQueryDto extends HomeQueryDto {
  @ApiPropertyOptional({
    description: '按名称搜索；trim 后最长 40；空字符串等同未传',
    maxLength: 40,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @MaxLength(40)
  keyword?: string;
}
