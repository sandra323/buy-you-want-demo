import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CN_MOBILE_PATTERN } from '../../auth/dto/auth.dto';

export class AddressInputDto {
  @ApiProperty({ minLength: 1, maxLength: 32 })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  receiverName!: string;

  @ApiProperty({ example: '13800000000', pattern: '^1[3-9]\\d{9}$' })
  @IsString()
  @Matches(CN_MOBILE_PATTERN)
  phone!: string;

  @ApiProperty({ minLength: 1, maxLength: 32 })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  province!: string;

  @ApiProperty({ minLength: 1, maxLength: 32 })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  city!: string;

  @ApiProperty({ minLength: 1, maxLength: 32 })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  district!: string;

  @ApiProperty({ minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  detail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
