import { randomUUID } from 'crypto';
import { ErrorCode } from '@lightbuy/shared';
import request from 'supertest';
import { parseDatabaseUrl } from '../../src/database/parse-database-url';
import {
  assertSafeTestDatabase,
  createTestApp,
  resetDb,
  resolveTestDatabaseUrl,
  type TestAppHandles,
} from './helpers';

describe('API e2e harness', () => {
  let handles: TestAppHandles;

  beforeAll(async () => {
    handles = await createTestApp();
  });

  afterAll(async () => {
    if (handles?.app) {
      await handles.app.close();
    }
  });

  it('refuses the demo database name', () => {
    expect(() =>
      assertSafeTestDatabase(
        'mysql://lightbuy:lightbuy@localhost:3306/lightbuy',
      ),
    ).toThrow(/lightbuy_test/);
  });

  it('refuses when TEST_DATABASE_URL names the demo database', () => {
    const originalTestUrl = process.env.TEST_DATABASE_URL;
    process.env.TEST_DATABASE_URL =
      'mysql://lightbuy:lightbuy@localhost:3306/lightbuy';
    try {
      const resolved = resolveTestDatabaseUrl();
      expect(() => assertSafeTestDatabase(resolved)).toThrow(/lightbuy_test/);
    } finally {
      if (originalTestUrl === undefined) {
        delete process.env.TEST_DATABASE_URL;
      } else {
        process.env.TEST_DATABASE_URL = originalTestUrl;
      }
    }
  });

  it('rewrites any DATABASE_URL schema to lightbuy_test when TEST_DATABASE_URL is unset', () => {
    const originalTestUrl = process.env.TEST_DATABASE_URL;
    const originalDbUrl = process.env.DATABASE_URL;
    delete process.env.TEST_DATABASE_URL;
    process.env.DATABASE_URL =
      'mysql://lightbuy:lightbuy@localhost:3306/personal_shared';
    try {
      const resolved = resolveTestDatabaseUrl();
      expect(parseDatabaseUrl(resolved).database).toBe('lightbuy_test');
      expect(parseDatabaseUrl(resolved)).toMatchObject({
        host: 'localhost',
        port: 3306,
        username: 'lightbuy',
      });
    } finally {
      if (originalTestUrl === undefined) {
        delete process.env.TEST_DATABASE_URL;
      } else {
        process.env.TEST_DATABASE_URL = originalTestUrl;
      }
      if (originalDbUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = originalDbUrl;
      }
    }
  });

  it('boots Nest with synchronize disabled', () => {
    expect(handles.app).toBeDefined();
    expect(handles.dataSource.isInitialized).toBe(true);
    expect(handles.dataSource.options.synchronize).toBe(false);
  });

  it('responds over HTTP with the api/v1 global prefix', async () => {
    const server = handles.app.getHttpServer();

    const prefixed = await request(server).get('/api/v1/no-such-route');
    expect(prefixed.status).toBe(404);
    expect(prefixed.body).toEqual({
      code: ErrorCode.NOT_FOUND,
      message: '资源不存在',
      data: null,
    });

    const unprefixed = await request(server).get('/no-such-route');
    expect(unprefixed.status).toBe(404);
    expect(unprefixed.body).toEqual({
      code: ErrorCode.NOT_FOUND,
      message: '资源不存在',
      data: null,
    });
  });

  it('resetDb clears users and orders so suites cannot pollute each other', async () => {
    await resetDb(handles.dataSource);

    const userId = randomUUID();
    await handles.dataSource.query(
      `INSERT INTO users (id, phone, password_hash, nickname, status)
       VALUES (?, ?, ?, ?, 1)`,
      [userId, '13800001111', 'e2e-placeholder-hash', 'harness'],
    );
    await handles.dataSource.query(
      `INSERT INTO orders (
         id, order_no, user_id, total_amount, status, receiver_snapshot
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        'E2E-ORDER-1',
        userId,
        '1.00',
        0,
        JSON.stringify({
          receiverName: 'e2e',
          phone: '13800001111',
          province: 'x',
          city: 'x',
          district: 'x',
          detail: 'x',
        }),
      ],
    );

    const [{ usersBefore }] = (await handles.dataSource.query(
      'SELECT COUNT(*) AS usersBefore FROM users',
    )) as Array<{ usersBefore: number | string }>;
    const [{ ordersBefore }] = (await handles.dataSource.query(
      'SELECT COUNT(*) AS ordersBefore FROM orders',
    )) as Array<{ ordersBefore: number | string }>;
    expect(Number(usersBefore)).toBeGreaterThan(0);
    expect(Number(ordersBefore)).toBeGreaterThan(0);

    await resetDb(handles.dataSource);

    const [{ usersAfter }] = (await handles.dataSource.query(
      'SELECT COUNT(*) AS usersAfter FROM users',
    )) as Array<{ usersAfter: number | string }>;
    const [{ ordersAfter }] = (await handles.dataSource.query(
      'SELECT COUNT(*) AS ordersAfter FROM orders',
    )) as Array<{ ordersAfter: number | string }>;
    expect(Number(usersAfter)).toBe(0);
    expect(Number(ordersAfter)).toBe(0);
  });
});
