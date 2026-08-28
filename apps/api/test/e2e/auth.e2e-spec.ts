import { randomUUID } from 'crypto';
import { hash } from 'bcryptjs';
import { ErrorCode } from '@lightbuy/shared';
import request from 'supertest';
import { BCRYPT_COST } from '../../src/auth/auth.service';
import { hashRefreshToken } from '../../src/auth/refresh-token.util';
import { BANNED_USER_PHONE } from '../../src/database/seed';
import { createTestApp, resetDb, type TestAppHandles } from './helpers';

describe('Auth e2e (Task 3.8)', () => {
  // 42900 信封在 auth.throttle.spec（limit: 2）锁定。本套件沿用 3.0 harness
  // 的高 THROTTLE_LIMIT，避免 register/refresh 循环误触限流。
  let handles: TestAppHandles;
  const password = 'password123';

  beforeAll(async () => {
    handles = await createTestApp();
  });

  afterAll(async () => {
    if (handles?.app) {
      await handles.app.close();
    }
  });

  beforeEach(async () => {
    await resetDb(handles.dataSource);
  });

  function http() {
    return request(handles.app.getHttpServer());
  }

  async function register(phone = '13800000002') {
    const res = await http().post('/api/v1/auth/register').send({
      phone,
      password,
      confirmPassword: password,
    });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(ErrorCode.OK);
    return res.body.data as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; phoneMask: string };
    };
  }

  it('register → login → refresh → me → logout; old refresh then fails', async () => {
    const registered = await register();

    const login = await http().post('/api/v1/auth/login').send({
      phone: '13800000002',
      password,
    });
    expect(login.status).toBe(200);
    expect(login.body.data.user.phoneMask).toBe('138****0002');

    const rotated = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registered.refreshToken });
    expect(rotated.status).toBe(200);
    expect(rotated.body.data.refreshToken).not.toBe(registered.refreshToken);

    const me = await http()
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${rotated.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.phoneMask).toBe('138****0002');

    const logout = await http()
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${rotated.body.data.accessToken}`);
    expect(logout.status).toBe(200);
    expect(logout.body.data).toEqual({ ok: true });

    const afterLogout = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotated.body.data.refreshToken });
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.code).toBe(ErrorCode.REFRESH_REVOKED);
  });

  it('reusing the old refresh within grace returns 40102 without killing the new token', async () => {
    const registered = await register('13800000003');
    const first = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registered.refreshToken });
    expect(first.status).toBe(200);

    const reused = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registered.refreshToken });
    expect(reused.status).toBe(401);
    expect(reused.body.code).toBe(ErrorCode.REFRESH_REVOKED);

    const stillValid = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.body.data.refreshToken });
    expect(stillValid.status).toBe(200);
    expect(stillValid.body.code).toBe(ErrorCode.OK);
  });

  it('reusing the old refresh after grace family-revokes remaining tokens', async () => {
    const registered = await register('13800000004');
    const first = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registered.refreshToken });
    expect(first.status).toBe(200);

    await handles.dataSource.query(
      `UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ?`,
      [
        new Date(Date.now() - 61_000),
        hashRefreshToken(registered.refreshToken),
      ],
    );

    const reused = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registered.refreshToken });
    expect(reused.status).toBe(401);
    expect(reused.body.code).toBe(ErrorCode.REFRESH_REVOKED);

    const familyDead = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.body.data.refreshToken });
    expect(familyDead.status).toBe(401);
    expect(familyDead.body.code).toBe(ErrorCode.REFRESH_REVOKED);
  });

  it('unknown refresh hash → 40103', async () => {
    const res = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'c'.repeat(128) });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(ErrorCode.REFRESH_EXPIRED);
  });

  it('banned seed phone login and refresh use 40201 without rotating', async () => {
    const passwordHash = await hash(password, BCRYPT_COST);
    const userId = randomUUID();
    await handles.dataSource.query(
      `INSERT INTO users (id, phone, password_hash, nickname, status)
       VALUES (?, ?, ?, ?, 0)`,
      [userId, BANNED_USER_PHONE, passwordHash, 'banned'],
    );

    const login = await http().post('/api/v1/auth/login').send({
      phone: BANNED_USER_PHONE,
      password,
    });
    expect(login.status).toBe(400);
    expect(login.body.code).toBe(ErrorCode.AUTH_CREDENTIALS);
    expect(login.body.message).toBe('手机号或密码错误');

    const active = await register('13800000005');
    await handles.dataSource.query(`UPDATE users SET status = 0 WHERE id = ?`, [
      active.user.id,
    ]);

    const refresh = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: active.refreshToken });
    expect(refresh.status).toBe(400);
    expect(refresh.body.code).toBe(ErrorCode.AUTH_CREDENTIALS);

    const stillHashed = await handles.dataSource.query(
      `SELECT revoked FROM refresh_tokens WHERE token_hash = ?`,
      [hashRefreshToken(active.refreshToken)],
    );
    expect(Number(stillHashed[0].revoked)).toBe(0);
  });
});
