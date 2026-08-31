import {
  shouldRefreshOnAppResume,
  shouldRefreshOnResume,
} from './refresh-on-resume';

describe('shouldRefreshOnResume', () => {
  it('skips the initial mount while already focused', () => {
    expect(shouldRefreshOnResume(null, true)).toBe(false);
  });

  it('refetches when returning from a covered screen', () => {
    expect(shouldRefreshOnResume(false, true)).toBe(true);
  });

  it('does not refetch while staying focused or leaving', () => {
    expect(shouldRefreshOnResume(true, true)).toBe(false);
    expect(shouldRefreshOnResume(true, false)).toBe(false);
  });

  it('refetches a focused list when the app returns to the foreground', () => {
    expect(shouldRefreshOnAppResume('background', 'active', true)).toBe(true);
    expect(shouldRefreshOnAppResume('inactive', 'active', true)).toBe(true);
  });

  it('does not refetch an unfocused list or non-resume transitions', () => {
    expect(shouldRefreshOnAppResume('background', 'active', false)).toBe(false);
    expect(shouldRefreshOnAppResume('active', 'active', true)).toBe(false);
  });
});
