import { canTrackAuthClick } from './auth-tracking';

describe('canTrackAuthClick', () => {
  it('only allows click after every field passes validation', () => {
    expect(canTrackAuthClick('请输入 11 位中国大陆手机号', undefined)).toBe(
      false,
    );
    expect(canTrackAuthClick(undefined, '密码需为 6–20 位')).toBe(false);
    expect(
      canTrackAuthClick(undefined, undefined, '两次输入的密码不一致'),
    ).toBe(false);
    expect(canTrackAuthClick(undefined, undefined)).toBe(true);
    expect(canTrackAuthClick(undefined, undefined, undefined)).toBe(true);
  });
});
