import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  INestApplication,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ErrorCode } from '@lightbuy/shared';
import { IsNotEmpty, IsString } from 'class-validator';
import request from 'supertest';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { AppException } from './app.exception';
import { createValidationPipe } from './configure-http-app';
import { TransformInterceptor } from './transform.interceptor';

class ProbeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

@Controller('envelope-probe')
class EnvelopeProbeController {
  @Get('ok')
  ok() {
    return { ping: true };
  }

  @Post('echo')
  echo(@Body() body: ProbeDto) {
    return body;
  }

  @Get('boom')
  boom() {
    throw new Error('internal diagnostic must not leak');
  }

  @Get('app-error')
  appError() {
    throw new AppException(ErrorCode.VALIDATION, '参数校验失败');
  }

  @Get('unauthorized')
  unauthorized() {
    throw new UnauthorizedException();
  }

  @Get('unavailable')
  unavailable() {
    throw new HttpException(
      {
        code: ErrorCode.INTERNAL,
        message: '服务器内部错误',
        data: { status: 'error', db: 'down', uptimeSec: 1 },
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

describe('API envelope', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EnvelopeProbeController],
      providers: [
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

  it('wraps success as code 0', async () => {
    const res = await request(app.getHttpServer()).get('/envelope-probe/ok');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      code: ErrorCode.OK,
      message: 'ok',
      data: { ping: true },
    });
  });

  it('maps invalid body to HTTP 400 and code 40001', async () => {
    const res = await request(app.getHttpServer())
      .post('/envelope-probe/echo')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: ErrorCode.VALIDATION,
      message: '参数校验失败',
      data: null,
    });
  });

  it('maps extra fields (forbidNonWhitelisted) to 40001', async () => {
    const res = await request(app.getHttpServer())
      .post('/envelope-probe/echo')
      .send({ name: 'ok', extra: true });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: ErrorCode.VALIDATION,
      message: '参数校验失败',
      data: null,
    });
  });

  it('maps unhandled errors to HTTP 500 and code 50000 without leaking details', async () => {
    const res = await request(app.getHttpServer()).get('/envelope-probe/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      code: ErrorCode.INTERNAL,
      message: '服务器内部错误',
      data: null,
    });
    expect(JSON.stringify(res.body)).not.toContain('diagnostic');
  });

  it('maps AppException to its code and HTTP status', async () => {
    const res = await request(app.getHttpServer()).get(
      '/envelope-probe/app-error',
    );
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: ErrorCode.VALIDATION,
      message: '参数校验失败',
      data: null,
    });
  });

  it('maps UnauthorizedException through the same filter (future JWT guards)', async () => {
    const res = await request(app.getHttpServer()).get(
      '/envelope-probe/unauthorized',
    );
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      code: ErrorCode.UNAUTHORIZED_MISSING,
      message: '未登录',
      data: null,
    });
  });

  it('preserves envelope-shaped HttpException data (health DB down)', async () => {
    const res = await request(app.getHttpServer()).get(
      '/envelope-probe/unavailable',
    );
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      code: ErrorCode.INTERNAL,
      message: '服务器内部错误',
      data: { status: 'error', db: 'down', uptimeSec: 1 },
    });
  });
});
