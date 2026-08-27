import type { User as PublicUser } from '@lightbuy/shared';
import type { User } from '../users/user.entity';

/** 对外只回脱敏号：`13800000000` → `138****0000`。 */
export function maskPhone(phone: string): string {
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

/** 注册默认昵称：`用户` + 手机号后四位（不是数据库列默认值）。 */
export function defaultNickname(phone: string): string {
  return `用户${phone.slice(-4)}`;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    phoneMask: maskPhone(user.phone),
    nickname: user.nickname,
    avatar: user.avatar ?? '',
  };
}
