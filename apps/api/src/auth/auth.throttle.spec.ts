import { ErrorCode } from '@lightbuy/shared';
import { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AllExceptionsFilter } from '../http/all-exceptions.filter';
import { createValidationPipe } from '../http/configure-http-app';
import { TransformInterceptor } from '../http/transform.interceptor';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('Auth register/login throttle', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60_000,
            limit: 2, // 测试环境压低阈值，第三次应返回 42900
          },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn().mockResolvedValue({ ok: true }),
            login: jest.fn().mockResolvedValue({ ok: true }),
          },
        },
        { provide: APP_PIPE, useFactory: createValidationPipe },
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

  it('returns 429 and 42900 after the limit', async () => {
    const body = {
      phone: '13800000000',
      password: 'password123',
    };

    const first = await request(app.getHttpServer())
      .post('/auth/login')
      .send(body);
    const second = await request(app.getHttpServer())
      .post('/auth/login')
      .send(body);
    const third = await request(app.getHttpServer())
      .post('/auth/login')
      .send(body);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body).toEqual({
      code: ErrorCode.RATE_LIMITED,
      message: '请求过于频繁',
      data: null,
    });
    expect(third.body.code).toBe(42900);
  });
});
