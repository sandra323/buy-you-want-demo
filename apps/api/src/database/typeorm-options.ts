import { join } from 'path';
import type { DataSourceOptions } from 'typeorm';
import { parseDatabaseUrl } from './parse-database-url';

/** True only when both NODE_ENV=development and TYPEORM_SYNC=1 (never in CI/prod). */
export function isTypeOrmSynchronizeEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' && process.env.TYPEORM_SYNC === '1'
  );
}

function migrationGlob(isCompiled: boolean): string {
  return isCompiled
    ? join(__dirname, '..', 'migrations', '*.js')
    : join(__dirname, '..', 'migrations', '*.ts');
}

function entityGlob(isCompiled: boolean): string {
  return isCompiled
    ? join(__dirname, '..', '**', '*.entity.js')
    : join(__dirname, '..', '**', '*.entity.ts');
}

export function buildTypeOrmOptions(
  isCompiled = __filename.endsWith('.js'),
): DataSourceOptions {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    throw new Error('DATABASE_URL is required');
  }

  const { host, port, username, password, database } =
    parseDatabaseUrl(databaseUrl);

  return {
    type: 'mysql',
    host,
    port,
    username,
    password,
    database,
    charset: 'utf8mb4',
    synchronize: isTypeOrmSynchronizeEnabled(),
    migrationsRun: false,
    migrations: [migrationGlob(isCompiled)],
    entities: [entityGlob(isCompiled)],
  };
}
