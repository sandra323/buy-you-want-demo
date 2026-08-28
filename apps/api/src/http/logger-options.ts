import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Options } from 'pino-http';

/** pino redact paths — Node lowercases incoming header names. */
export const PINO_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.Authorization',
] as const;

/** Never attach bodies — especially auth register/login/refresh payloads. */
export function serializeRequest(req: {
  id?: unknown;
  method?: string;
  url?: string;
  headers?: IncomingMessage['headers'];
  body?: unknown;
  raw?: { body?: unknown };
}): Record<string, unknown> {
  return {
    id: req.id,
    method: req.method,
    url: req.url,
    headers: req.headers,
  };
}

export function requestIdFrom(
  req: IncomingMessage,
  res: ServerResponse,
): string {
  const header = req.headers['x-request-id'];
  const id =
    (typeof header === 'string' && header.trim()) ||
    (Array.isArray(header) && header[0]?.trim()) ||
    randomUUID();
  res.setHeader('x-request-id', id);
  return id;
}

function pathOnly(url?: string): string | undefined {
  return url?.split('?')[0];
}

function userIdFrom(req: IncomingMessage): string | undefined {
  const user = (
    req as IncomingMessage & { user?: { id?: string; sub?: string } }
  ).user;
  const id = user?.id ?? user?.sub;
  return id || undefined;
}

export function buildPinoHttpOptions(nodeEnv = process.env.NODE_ENV): Options {
  return {
    level: nodeEnv === 'test' ? 'silent' : 'info',
    genReqId: requestIdFrom,
    customAttributeKeys: {
      responseTime: 'latency',
    },
    redact: {
      paths: [...PINO_REDACT_PATHS],
      censor: '[Redacted]',
    },
    serializers: {
      req: serializeRequest,
    },
    customProps: (req, res) => {
      const userId = userIdFrom(req);
      return {
        method: req.method,
        path: pathOnly(req.url),
        status: res.statusCode,
        requestId: req.id,
        ...(userId ? { userId } : {}),
      };
    },
  };
}
