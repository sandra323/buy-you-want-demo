import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { configureHttpApp } from '../../src/http/configure-http-app';
import mysql from 'mysql2/promise';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import {
  parseDatabaseUrl,
  type ParsedDatabaseUrl,
} from '../../src/database/parse-database-url';
import {
  buildTypeOrmOptions,
  isTypeOrmSynchronizeEnabled,
} from '../../src/database/typeorm-options';

const DEMO_DATABASE_NAME = 'lightbuy';
const DEFAULT_TEST_DATABASE_NAME = 'lightbuy_test';
const DEFAULT_TEST_DATABASE_URL =
  'mysql://lightbuy:lightbuy@localhost:3306/lightbuy_test';
const DEFAULT_TEST_JWT_SECRET = 'e2e-test-jwt-secret-not-for-production-use!!';
const TYPEORM_MIGRATIONS_TABLE = 'migrations';

const IDENTIFIER_RE = /^[A-Za-z0-9_]+$/;

export type TestAppHandles = {
  app: INestApplication;
  dataSource: DataSource;
};

let activeHandles: TestAppHandles | undefined;
let e2eEnvApplied = false;

/** Walk up from this file until the monorepo root (`pnpm-workspace.yaml` or `.env.example`). */
export function findRepoRoot(startDir = __dirname): string | undefined {
  let dir = startDir;
  for (;;) {
    if (
      existsSync(join(dir, 'pnpm-workspace.yaml')) ||
      existsSync(join(dir, '.env.example'))
    ) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

function repoEnvPath(): string | undefined {
  const root = findRepoRoot(__dirname);
  return root ? join(root, '.env') : undefined;
}

function loadDotEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }

  const text = readFileSync(filePath, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function rewriteDatabaseName(databaseUrl: string, database: string): string {
  const parsed = parseDatabaseUrl(databaseUrl);
  const user = encodeURIComponent(parsed.username);
  const password = encodeURIComponent(parsed.password);
  return `mysql://${user}:${password}@${parsed.host}:${parsed.port}/${database}`;
}

/**
 * Resolve a dedicated test URL. E2e never keeps a non-test schema name:
 * TEST_DATABASE_URL if set, otherwise rewrite DATABASE_URL's database to
 * `lightbuy_test` (any original name — not only `lightbuy`).
 */
export function resolveTestDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) {
    return rewriteDatabaseName(fromEnv, DEFAULT_TEST_DATABASE_NAME);
  }

  return DEFAULT_TEST_DATABASE_URL;
}

export function assertSafeTestDatabase(databaseUrl: string): string {
  const { database } = parseDatabaseUrl(databaseUrl);
  if (!database || database.toLowerCase() === DEMO_DATABASE_NAME) {
    throw new Error(
      `e2e refuses to run against database "${database || '(empty)'}". ` +
        'Use a dedicated schema such as lightbuy_test (set TEST_DATABASE_URL).',
    );
  }
  return database;
}

export function getThrottlerTestOverrides(): { ttl: number; limit: number } {
  const ttl = Number(process.env.THROTTLE_TTL);
  const limit = Number(process.env.THROTTLE_LIMIT);
  return {
    ttl: Number.isFinite(ttl) && ttl > 0 ? ttl : 60,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 10_000,
  };
}

export function applyE2eEnv(): void {
  if (e2eEnvApplied) {
    return;
  }

  const fromRepo = repoEnvPath();
  if (fromRepo) {
    loadDotEnvFile(fromRepo);
  }
  loadDotEnvFile(join(process.cwd(), '.env'));
  loadDotEnvFile(join(process.cwd(), '../.env'));

  process.env.NODE_ENV = 'test';
  delete process.env.TYPEORM_SYNC;
  // Never send e2e failures to Sentry Cloud (even if a local .env has a DSN).
  delete process.env.SENTRY_DSN;

  process.env.DATABASE_URL = resolveTestDatabaseUrl();

  if (!process.env.JWT_SECRET?.trim()) {
    process.env.JWT_SECRET = DEFAULT_TEST_JWT_SECRET;
  }

  const throttle = getThrottlerTestOverrides();
  if (!process.env.THROTTLE_TTL) {
    process.env.THROTTLE_TTL = String(throttle.ttl);
  }
  if (!process.env.THROTTLE_LIMIT) {
    process.env.THROTTLE_LIMIT = String(throttle.limit);
  }

  e2eEnvApplied = true;
}

function assertE2eEnvReady(): void {
  if (!e2eEnvApplied || process.env.NODE_ENV !== 'test') {
    throw new Error(
      'createTestApp requires applyE2eEnv() — register test/e2e/setup-env.ts in Jest setupFiles',
    );
  }
}

function assertIdentifier(value: string, label: string): string {
  if (!IDENTIFIER_RE.test(value)) {
    throw new Error(`Unsafe ${label} for e2e MySQL: ${value}`);
  }
  return value;
}

async function ensureTestDatabaseExists(
  parsed: ParsedDatabaseUrl,
): Promise<void> {
  const database = assertIdentifier(parsed.database, 'database name');
  const username = assertIdentifier(parsed.username, 'username');
  const rootPassword = process.env.MYSQL_ROOT_PASSWORD ?? 'root';

  const tryCreate = async (
    user: string,
    password: string,
  ): Promise<boolean> => {
    const conn = await mysql.createConnection({
      host: parsed.host,
      port: parsed.port,
      user,
      password,
    });
    try {
      await conn.query(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      if (user === 'root') {
        await conn.query(
          `GRANT ALL PRIVILEGES ON \`${database}\`.* TO '${username}'@'%'`,
        );
        await conn.query(
          `GRANT ALL PRIVILEGES ON \`${database}\`.* TO '${username}'@'localhost'`,
        );
        await conn.query('FLUSH PRIVILEGES');
      }
      return true;
    } finally {
      await conn.end();
    }
  };

  try {
    await tryCreate('root', rootPassword);
    return;
  } catch (rootError) {
    try {
      await tryCreate(parsed.username, parsed.password);
    } catch {
      throw rootError;
    }
  }
}

/** Same DataSource entry as `scripts/migrate.js` / TypeORM CLI. */
async function runMigrations(): Promise<void> {
  const { default: dataSource } =
    await import('../../src/database/data-source');
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

function assertSynchronizeDisabled(): void {
  if (process.env.TYPEORM_SYNC === '1') {
    throw new Error('e2e requires TYPEORM_SYNC to be unset (not 1)');
  }
  if (isTypeOrmSynchronizeEnabled()) {
    throw new Error('e2e requires TypeORM synchronize to be disabled');
  }
  const options = buildTypeOrmOptions(false);
  if (options.synchronize) {
    throw new Error(
      'e2e bootstrap refused: TypeORM synchronize is enabled (use migrations only)',
    );
  }
}

export async function createTestApp(): Promise<TestAppHandles> {
  assertE2eEnvReady();
  assertSafeTestDatabase(process.env.DATABASE_URL ?? '');
  assertSynchronizeDisabled();

  const parsed = parseDatabaseUrl(process.env.DATABASE_URL ?? '');
  await ensureTestDatabaseExists(parsed);
  await runMigrations();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureHttpApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  if (dataSource.options.synchronize) {
    await app.close();
    throw new Error(
      'e2e bootstrap refused: Nest DataSource has synchronize=true',
    );
  }

  activeHandles = { app, dataSource };
  return activeHandles;
}

export async function resetDb(dataSource?: DataSource): Promise<void> {
  const ds = dataSource ?? activeHandles?.dataSource;
  if (!ds?.isInitialized) {
    throw new Error('resetDb requires an initialized DataSource');
  }

  const rows = (await ds.query(
    `SELECT TABLE_NAME AS tableName
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_type = 'BASE TABLE'`,
  )) as Array<{ tableName: string }>;

  const tables = rows
    .map((row) => row.tableName)
    .filter((name) => name && name !== TYPEORM_MIGRATIONS_TABLE)
    .map((name) => assertIdentifier(name, 'table name'));

  await ds.query('SET FOREIGN_KEY_CHECKS=0');
  try {
    for (const table of tables) {
      await ds.query(`TRUNCATE TABLE \`${table}\``);
    }
  } finally {
    await ds.query('SET FOREIGN_KEY_CHECKS=1');
  }
}

/** Tiny fixture for later suites — not the demo catalog seed. */
export async function seedMinimal(
  dataSource?: DataSource,
): Promise<{ userId: string }> {
  const ds = dataSource ?? activeHandles?.dataSource;
  if (!ds?.isInitialized) {
    throw new Error('seedMinimal requires an initialized DataSource');
  }

  const userId = randomUUID();
  await ds.query(
    `INSERT INTO users (id, phone, password_hash, nickname, status)
     VALUES (?, ?, ?, ?, 1)`,
    [userId, '13900009999', 'e2e-placeholder-hash', 'e2e'],
  );
  return { userId };
}
