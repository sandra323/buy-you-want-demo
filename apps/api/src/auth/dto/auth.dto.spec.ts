import { validate } from 'class-validator';
import { LoginDto, RegisterDto } from './auth.dto';

function registerDto(overrides: Partial<RegisterDto> = {}): RegisterDto {
  return Object.assign(new RegisterDto(), {
    phone: '13800000000',
    password: 'password123',
    confirmPassword: 'password123',
    ...overrides,
  });
}

describe('auth DTOs', () => {
  it('accepts a valid register payload', async () => {
    await expect(validate(registerDto())).resolves.toHaveLength(0);
  });

  it('rejects a non-CN mobile', async () => {
    const errors = await validate(registerDto({ phone: '12800000000' }));
    expect(errors.some((e) => e.property === 'phone')).toBe(true);
  });

  it('rejects password shorter than 6 or longer than 20', async () => {
    const short = await validate(
      registerDto({ password: '12345', confirmPassword: '12345' }),
    );
    const long = await validate(
      registerDto({
        password: 'a'.repeat(21),
        confirmPassword: 'a'.repeat(21),
      }),
    );
    expect(short.some((e) => e.property === 'password')).toBe(true);
    expect(long.some((e) => e.property === 'password')).toBe(true);
  });

  it('rejects confirmPassword mismatch', async () => {
    const errors = await validate(
      registerDto({ confirmPassword: 'password124' }),
    );
    expect(errors.some((e) => e.property === 'confirmPassword')).toBe(true);
  });

  it('login requires the same phone pattern', async () => {
    const dto = Object.assign(new LoginDto(), {
      phone: '1380000000',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'phone')).toBe(true);
  });
});
