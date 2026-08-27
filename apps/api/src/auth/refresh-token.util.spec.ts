import {
  hashRefreshToken,
  generateRawRefreshToken,
} from './refresh-token.util';

describe('refresh-token.util', () => {
  it('returns a 64-byte hex raw token and a 32-byte sha256 hex', () => {
    const raw = generateRawRefreshToken();
    expect(raw).toMatch(/^[0-9a-f]{128}$/);
    const hashed = hashRefreshToken(raw);
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).not.toBe(raw);
    expect(hashRefreshToken(raw)).toBe(hashed);
  });
});
