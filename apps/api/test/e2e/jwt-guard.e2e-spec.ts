import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ErrorCode } from '@lightbuy/shared';
import request from 'supertest';
import { createTestApp, resetDb, type TestAppHandles } from './helpers';

describe('JWT access guard (Task 3.4)', () => {
  let handles: TestAppHandles;
  let jwtService: JwtService;

  beforeAll(async () => {
    handles = await createTestApp();
    jwtService = handles.app.get(JwtService);
  });

  function accessToken(
    userId: string,
    options: { expiresIn?: string | number } = {},
  ): string {
    return jwtService.sign(
      { sub: userId },
      { expiresIn: options.expiresIn ?? '30m' },
    );
  }

  afterAll(async () => {
    if (handles?.app) {
      await handles.app.close();
    }
  });

  beforeEach(async () => {
    await resetDb(handles.dataSource);
  });

  async function insertUser(status: 0 | 1): Promise<string> {
    const id = randomUUID();
    await handles.dataSource.query(
      `INSERT INTO users (id, phone, password_hash, nickname, status)
       VALUES (?, ?, ?, ?, ?)`,
      [id, status === 0 ? '13800000001' : '13800000000', 'hash', 'e2e', status],
    );
    return id;
  }

  it('GET /api/v1/health stays public', async () => {
    const res = await request(handles.app.getHttpServer()).get(
      '/api/v1/health',
    );
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(ErrorCode.OK);
  });

  it('POST /api/v1/auth/refresh stays public', async () => {
    const res = await request(handles.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'a'.repeat(128) });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(ErrorCode.REFRESH_EXPIRED);
  });

  it('protected route without header → 401 and 40110', async () => {
    const res = await request(handles.app.getHttpServer()).get(
      '/api/v1/auth/session',
    );
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      code: ErrorCode.UNAUTHORIZED_MISSING,
      message: '未登录',
      data: null,
    });
  });

  it('expired JWT (short TTL) → 401 and 40100', async () => {
    const userId = await insertUser(1);
    const token = accessToken(userId, { expiresIn: -1 });

    const res = await request(handles.app.getHttpServer())
      .get('/api/v1/auth/session')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      code: ErrorCode.UNAUTHORIZED_EXPIRED,
      message: '登录已过期',
      data: null,
    });
  });

  it('banned user with a still-valid JWT → 401 and 40110', async () => {
    const userId = await insertUser(0);
    const token = accessToken(userId);

    const res = await request(handles.app.getHttpServer())
      .get('/api/v1/auth/session')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      code: ErrorCode.UNAUTHORIZED_MISSING,
      message: '未登录',
      data: null,
    });
    expect(res.body.code).not.toBe(ErrorCode.FORBIDDEN_RESERVED);
  });

  it('malformed JWT → 401 and 40101', async () => {
    const res = await request(handles.app.getHttpServer())
      .get('/api/v1/auth/session')
      .set('Authorization', 'Bearer not-a-jwt');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      code: ErrorCode.UNAUTHORIZED_INVALID,
      message: '登录无效',
      data: null,
    });
  });

  it('active user with valid JWT reaches the protected route', async () => {
    const userId = await insertUser(1);
    const token = accessToken(userId);

    const res = await request(handles.app.getHttpServer())
      .get('/api/v1/auth/session')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: ErrorCode.OK,
      message: 'ok',
      data: { userId },
    });
  });
});
