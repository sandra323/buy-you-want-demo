const DEFAULT_ACCESS_TTL = '30m';
const DEFAULT_REFRESH_TTL = '30d';

const DURATION_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
}

export function getJwtAccessTtl(): string {
  return process.env.JWT_ACCESS_TTL?.trim() || DEFAULT_ACCESS_TTL;
}

/** 解析环境变量里的 `30d` / `30m` / `2h` 这类 TTL，转成毫秒。 */
export function parseDurationToMs(raw: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(raw.trim());
  if (!match) {
    throw new Error(`Invalid duration "${raw}" (use e.g. 30m, 30d)`);
  }
  return Number(match[1]) * DURATION_MS[match[2]];
}

/** Refresh 过期时间给 Date 用，所以要毫秒；Access TTL 仍是 jsonwebtoken 字符串。 */
export function getJwtRefreshTtlMs(): number {
  return parseDurationToMs(
    process.env.JWT_REFRESH_TTL?.trim() || DEFAULT_REFRESH_TTL,
  );
}
