import { decimalStringFromCents, fromCents, toCents } from './money';

describe('money', () => {
  it('round-trips decimal strings through integer cents', () => {
    expect(toCents('19.90')).toBe(1990);
    expect(fromCents(1990)).toBe(19.9);
    expect(decimalStringFromCents(1990)).toBe('19.90');
    expect(toCents('19.90') * 3).toBe(5970);
  });
});
