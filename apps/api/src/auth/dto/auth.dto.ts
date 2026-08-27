import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsMatch } from './match.decorator';

/** 大陆手机号：11 位，`1[3-9]` 开头。 */
export const CN_MOBILE_PATTERN = /^1[3-9]\d{9}$/;

export class RegisterDto {
  @ApiProperty({ example: '13800000000', description: '大陆 11 位手机号' })
  @IsString()
  @Matches(CN_MOBILE_PATTERN)
  phone!: string;

  @ApiProperty({ example: 'password123', minLength: 6, maxLength: 20 })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password!: string;

  @ApiProperty({ example: 'password123', minLength: 6, maxLength: 20 })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @IsMatch('password')
  confirmPassword!: string;
}

export class LoginDto {
  @ApiProperty({ example: '13800000000', description: '大陆 11 位手机号' })
  @IsString()
  @Matches(CN_MOBILE_PATTERN)
  phone!: string;

  @ApiProperty({ example: 'password123', minLength: 6, maxLength: 20 })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password!: string;
}
