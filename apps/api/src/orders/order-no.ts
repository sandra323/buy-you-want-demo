import { randomInt } from 'crypto';

/** `LB` + UTC `yyyyMMddHHmmss` + 6 位 CSPRNG 数字。 */
export function generateOrderNo(now: Date): string {
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
    String(now.getUTCHours()).padStart(2, '0'),
    String(now.getUTCMinutes()).padStart(2, '0'),
    String(now.getUTCSeconds()).padStart(2, '0'),
  ].join('');
  const suffix = String(randomInt(0, 1_000_000)).padStart(6, '0');
  return `LB${stamp}${suffix}`;
}
