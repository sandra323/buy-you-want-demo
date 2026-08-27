const MIN_JWT_SECRET_BYTES = 32;

export function validateBootEnv(): void {
  const errors: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    errors.push('DATABASE_URL is required and must not be empty');
  }

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required and must not be empty');
  } else if (Buffer.byteLength(jwtSecret, 'utf8') < MIN_JWT_SECRET_BYTES) {
    errors.push(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_BYTES} bytes (got ${Buffer.byteLength(jwtSecret, 'utf8')})`,
    );
  }

  if (errors.length > 0) {
    console.error('[boot] Environment validation failed:');
    for (const message of errors) {
      console.error(`  - ${message}`);
    }
    process.exit(1);
  }
}
