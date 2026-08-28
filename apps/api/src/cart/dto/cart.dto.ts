import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { CART_MAX_QUANTITY } from '../cart-qty';

export class AddCartItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ minimum: 1, maximum: CART_MAX_QUANTITY })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CART_MAX_QUANTITY)
  quantity!: number;
}

export class UpdateCartItemDto {
  @ApiPropertyOptional({ minimum: 1, maximum: CART_MAX_QUANTITY })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CART_MAX_QUANTITY)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  selected?: boolean;
}
