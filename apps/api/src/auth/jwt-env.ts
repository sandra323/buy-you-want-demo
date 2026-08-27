const DEFAULT_ACCESS_TTL = '30m';

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
