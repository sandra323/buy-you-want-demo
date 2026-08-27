import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

export const API_GLOBAL_PREFIX = 'api/v1';

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
}

/** Prefix used by bootstrap and e2e. Pipes/filter/interceptor live on AppModule. */
export function configureHttpApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.useLogger(app.get(Logger));
  return app;
}
