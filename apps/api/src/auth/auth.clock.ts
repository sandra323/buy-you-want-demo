/** 可注入时钟，refresh 复用窗口单测用 59s / 61s，避免真 sleep。 */
export class AuthClock {
  now(): Date {
    return new Date();
  }
}
