import { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ErrorCode } from '@lightbuy/shared';
import request from 'supertest';
import { AllExceptionsFilter } from '../http/all-exceptions.filter';
import { TransformInterceptor } from '../http/transform.interceptor';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let app: INestApplication;
  const check = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthService, useValue: { check } },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    check.mockReset();
  });

  it('returns HTTP 200, code 0, and db up when healthy', async () => {
    check.mockResolvedValue({
      status: 'ok',
      db: 'up',
      uptimeSec: 9,
    });

    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: ErrorCode.OK,
      message: 'ok',
      data: { status: 'ok', db: 'up', uptimeSec: 9 },
    });
  });

  it('returns HTTP 503 and code 50000 when db is down', async () => {
    check.mockResolvedValue({
      status: 'error',
      db: 'down',
      uptimeSec: 4,
    });

    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      code: ErrorCode.INTERNAL,
      message: '服务器内部错误',
      data: { status: 'error', db: 'down', uptimeSec: 4 },
    });
  });
});
