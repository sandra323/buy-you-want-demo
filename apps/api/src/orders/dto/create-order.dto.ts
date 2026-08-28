import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CART_MAX_QUANTITY } from '../../cart/cart-qty';

export class OrderLineItemDto {
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

@ValidatorConstraint({ name: 'exactlyOneOrderLineSource', async: false })
class ExactlyOneOrderLineSourceConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as CreateOrderDto;
    const fromCart = dto.fromCart === true;
    const hasItems = dto.items !== undefined;
    return fromCart !== hasItems;
  }

  defaultMessage(): string {
    return 'provide exactly one of fromCart or items';
  }
}

export class CreateOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @Validate(ExactlyOneOrderLineSourceConstraint)
  addressId!: string;

  @ApiPropertyOptional({
    description: '为 true 时从购物车已选行下单，且不能同时传 items',
  })
  @IsOptional()
  @IsBoolean()
  fromCart?: boolean;

  @ApiPropertyOptional({ type: [OrderLineItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineItemDto)
  items?: OrderLineItemDto[];
}
