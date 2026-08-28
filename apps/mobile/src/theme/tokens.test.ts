import { tokens } from './tokens';

describe('design tokens', () => {
  it('matches build-spec §2 brand and page colors', () => {
    expect(tokens.color.primary).toBe('#FF5000');
    expect(tokens.color.background).toBe('#F5F5F5');
    expect(tokens.color.surface).toBe('#FFFFFF');
    expect(tokens.color.originalPrice).toBe('#999999');
  });
});
