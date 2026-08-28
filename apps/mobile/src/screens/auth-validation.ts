const PHONE_RE = /^1[3-9]\d{9}$/;

export function validatePhone(phone: string): string | undefined {
  if (!PHONE_RE.test(phone)) {
    return '请输入 11 位中国大陆手机号';
  }
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (password.length < 6 || password.length > 20) {
    return '密码需为 6–20 位';
  }
  return undefined;
}
