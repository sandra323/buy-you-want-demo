import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsMatch } from './match.decorator';

/** 大陆手机号：11 位，`1[3-9]` 开头。 */
export const CN_MOBILE_PATTERN = /^1[3-9]\d{9}$/;

export class RegisterDto {
  @IsString()
  @Matches(CN_MOBILE_PATTERN)
  phone!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @IsMatch('password')
  confirmPassword!: string;
}

export class LoginDto {
  @IsString()
  @Matches(CN_MOBILE_PATTERN)
  phone!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password!: string;
}
