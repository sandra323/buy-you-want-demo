import { escapeLikePattern } from './escape-like';

describe('escapeLikePattern', () => {
  it('treats %, _, and \\ as literals', () => {
    expect(escapeLikePattern('%')).toBe('\\%');
    expect(escapeLikePattern('_')).toBe('\\_');
    expect(escapeLikePattern('\\')).toBe('\\\\');
  });

  it('escapes backslash first so wildcards stay escaped', () => {
    expect(escapeLikePattern('\\%')).toBe('\\\\\\%');
    expect(escapeLikePattern('100%')).toBe('100\\%');
  });
});
