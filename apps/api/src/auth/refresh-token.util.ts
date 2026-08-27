import { createHash, randomBytes } from 'crypto';

/** 64 字节 CSPRNG，hex 后 128 字符；明文只返回一次。 */
const RAW_BYTES = 64;

export function generateRawRefreshToken(): string {
  return randomBytes(RAW_BYTES).toString('hex');
}

/** 落库用 sha256 hex，查找时对客户端传来的明文再哈希一次比对。 */
export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
