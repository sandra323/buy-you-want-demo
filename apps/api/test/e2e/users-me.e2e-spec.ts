import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ErrorCode } from '@lightbuy/shared';
import request from 'supertest';
import { swaggerJsonPath, swaggerUiPath } from '../../src/http/setup-swagger';
import { createTestApp, resetDb, type TestAppHandles } from './helpers';

describe('GET /users/me and Swagger (Task 3.7)', () => {
  let handles: TestAppHandles;
  let jwtService: JwtService;

  beforeAll(async () => {
    handles = await createTestApp();
    jwtService = handles.app.get(JwtService);
  });

  afterAll(async () => {
    if (handles?.app) {
      await handles.app.close();
    }
  });

  beforeEach(async () => {
    await resetDb(handles.dataSource);
  });

  async function insertUser(): Promise<string> {
    const id = randomUUID();
    await handles.dataSource.query(
      `INSERT INTO users (id, phone, password_hash, nickname, status)
       VALUES (?, ?, ?, ?, 1)`,
      [id, '13800000000', 'hash', '用户0000'],
    );
    return id;
  }

  it('authenticated GET /api/v1/users/me returns masked phone from DB', async () => {
    const userId = await insertUser();
    const token = jwtService.sign({ sub: userId });

    const res = await request(handles.app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: ErrorCode.OK,
      message: 'ok',
      data: {
        id: userId,
        phoneMask: '138****0000',
        nickname: '用户0000',
        avatar: '',
      },
    });
  });

  it('GET /api/docs is public and lists auth + users', async () => {
    const ui = await request(handles.app.getHttpServer()).get(swaggerUiPath());
    expect(ui.status).toBe(200);
    expect(ui.text).toMatch(/swagger/i);

    const spec = await request(handles.app.getHttpServer()).get(
      swaggerJsonPath(),
    );
    expect(spec.status).toBe(200);
    expect(spec.body.paths['/api/v1/auth/login']).toBeDefined();
    expect(spec.body.paths['/api/v1/users/me']).toBeDefined();
  });
});
