import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ErrorCode } from '@lightbuy/shared';
import * as Sentry from '@sentry/nestjs';
import request from 'supertest';
import { AllExceptionsFilter } from '../http/all-exceptions.filter';
import { AppException } from '../http/app.exception';
import { initSentry } from './init-sentry';
import type { SentryInitOptions } from './sentry-options';

@Controller('sentry-probe')
class SentryProbeController {
  @Get('boom')
  boom() {
    throw new Error('unhandled sentry probe');
  }

  @Get('app-error')
  appError() {
    throw new AppException(ErrorCode.VALIDATION);
  }
}

describe('Sentry captures unhandled 500s', () => {
  let app: INestApplication;
  const envelopes: unknown[] = [];

  afterEach(async () => {
    envelopes.length = 0;
    if (app) {
      await app.close();
    }
    await Sentry.close();
  });

  async function boot(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      controllers: [SentryProbeController],
      providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
    }).compile();

    const nestApp = moduleRef.createNestApplication();
    await nestApp.init();
    return nestApp;
  }

  it('does not init or send when DSN is unset; HTTP envelope is unchanged', async () => {
    const init = jest.fn();
    expect(initSentry({ SENTRY_DSN: '' }, init)).toBe(false);
    expect(init).not.toHaveBeenCalled();

    app = await boot();
    const res = await request(app.getHttpServer()).get('/sentry-probe/boom');
    await Sentry.flush(1000);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      code: ErrorCode.INTERNAL,
      message: '服务器内部错误',
      data: null,
    });
    expect(envelopes).toHaveLength(0);
  });

  it('captures an unhandled throw with a mock DSN transport', async () => {
    const dsn = 'https://public@127.0.0.1/1';
    initSentry({ SENTRY_DSN: dsn, SENTRY_RELEASE: '1.0.0+1' }, (options) => {
      const base = options as SentryInitOptions;
      return Sentry.init({
        ...base,
        defaultIntegrations: false,
        skipOpenTelemetrySetup: true,
        transport: () => ({
          send: async (envelope) => {
            envelopes.push(envelope);
            return { statusCode: 200 };
          },
          flush: async () => true,
        }),
      });
    });

    app = await boot();
    const res = await request(app.getHttpServer()).get('/sentry-probe/boom');
    await Sentry.flush(2000);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      code: ErrorCode.INTERNAL,
      message: '服务器内部错误',
      data: null,
    });
    expect(JSON.stringify(res.body)).not.toContain('unhandled sentry probe');
    expect(envelopes.length).toBeGreaterThan(0);
    expect(JSON.stringify(envelopes)).toContain('unhandled sentry probe');
    expect(JSON.stringify(envelopes)).toContain('1.0.0+1');
  });

  it('does not capture expected AppException (not an unhandled 500)', async () => {
    initSentry({ SENTRY_DSN: 'https://public@127.0.0.1/1' }, (options) => {
      const base = options as SentryInitOptions;
      return Sentry.init({
        ...base,
        defaultIntegrations: false,
        skipOpenTelemetrySetup: true,
        transport: () => ({
          send: async (envelope) => {
            envelopes.push(envelope);
            return { statusCode: 200 };
          },
          flush: async () => true,
        }),
      });
    });

    app = await boot();
    const res = await request(app.getHttpServer()).get(
      '/sentry-probe/app-error',
    );
    await Sentry.flush(2000);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(ErrorCode.VALIDATION);
    expect(envelopes).toHaveLength(0);
  });
});
