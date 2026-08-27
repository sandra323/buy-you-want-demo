import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const guard = new JwtAuthGuard(reflector as unknown as Reflector);

  beforeEach(() => {
    reflector.getAllAndOverride.mockReset();
  });

  it('skips JWT when @Public() metadata is set', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });
});
