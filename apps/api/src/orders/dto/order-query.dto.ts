import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PAGINATION_DEFAULT_PAGE,
  PAGINATION_DEFAULT_PAGE_SIZE,
  PAGINATION_MAX_PAGE_SIZE,
} from '@lightbuy/shared';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class OrderListQueryDto {
  @ApiPropertyOptional({
    description:
      '省略或 all 表示全部；0=待支付，1=待发货，4=待收货，2=已完成，3=已取消',
    enum: ['all', '0', '1', '2', '3', '4'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === '' || value === 'all') {
      return undefined;
    }
    return Number(value);
  })
  @IsInt()
  @IsIn([0, 1, 2, 3, 4])
  status?: 0 | 1 | 2 | 3 | 4;

  @ApiPropertyOptional({ default: PAGINATION_DEFAULT_PAGE, minimum: 1 })
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
