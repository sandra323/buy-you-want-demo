import pino from 'pino';
import {
  buildPinoHttpOptions,
  PINO_REDACT_PATHS,
  serializeRequest,
} from './logger-options';

describe('logger options', () => {
  it('redacts Authorization (and req.headers.authorization)', () => {
    expect(PINO_REDACT_PATHS).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.Authorization',
      ]),
    );

    const chunks: string[] = [];
    const logger = pino(
      {
        redact: {
          paths: [...PINO_REDACT_PATHS],
          censor: '[Redacted]',
        },
      },
      { write: (chunk) => chunks.push(chunk) },
    );

    logger.info({
      req: {
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig',
        },
      },
    });

    const line = chunks.join('');
    expect(line).not.toContain('Bearer');
    expect(line).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(line).toContain('[Redacted]');
  });

  it('never serializes request bodies, including auth routes', () => {
    const serialized = serializeRequest({
      id: 'req-1',
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { authorization: 'Bearer secret-token' },
      body: { phone: '13800000000', password: 'password123' },
      raw: { body: { password: 'password123' } },
    });

    expect(serialized).toEqual({
      id: 'req-1',
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { authorization: 'Bearer secret-token' },
    });
    expect(serialized).not.toHaveProperty('body');
    expect(JSON.stringify(serialized)).not.toContain('password123');
  });

  it('exposes method path status latency userId requestId in pino-http options', () => {
    const options = buildPinoHttpOptions('production');
    expect(options.level).toBe('info');
    expect(options.customAttributeKeys).toEqual({ responseTime: 'latency' });
    expect(options.redact).toMatchObject({
      paths: expect.arrayContaining(['req.headers.authorization']),
    });

    const req = {
      method: 'GET',
      url: '/api/v1/orders?page=1',
      id: 'rid-1',
      user: { id: 'user-1' },
      headers: {},
    };
    const res = { statusCode: 200 };
    const props = options.customProps?.(req as never, res as never) as Record<
      string,
      unknown
    >;
    expect(props).toMatchObject({
      method: 'GET',
      path: '/api/v1/orders',
      status: 200,
      requestId: 'rid-1',
      userId: 'user-1',
    });
    expect(props).not.toHaveProperty('body');
  });

  it('does not copy request bodies onto customProps', () => {
    const options = buildPinoHttpOptions('production');
    const req = {
      method: 'POST',
      url: '/api/v1/auth/login',
      id: 'rid-auth',
      headers: {},
      body: { phone: '13800000000', password: 'password123' },
    };
    const res = { statusCode: 200 };
    const props = options.customProps?.(req as never, res as never) as Record<
      string,
      unknown
    >;
    expect(props).not.toHaveProperty('body');
    expect(JSON.stringify(props)).not.toContain('password123');
    expect(JSON.stringify(props)).not.toContain('13800000000');
  });

  it('silences logs in test', () => {
    expect(buildPinoHttpOptions('test').level).toBe('silent');
  });
});
