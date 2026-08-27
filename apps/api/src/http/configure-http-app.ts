import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { API_GLOBAL_PREFIX } from './api-prefix';
import { setupSwagger } from './setup-swagger';

export { API_GLOBAL_PREFIX } from './api-prefix';

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
  setupSwagger(app);
  return app;
}
