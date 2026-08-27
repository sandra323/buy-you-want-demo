import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateBootEnv } from './database/validate-env';
import { configureHttpApp } from './http/configure-http-app';

async function bootstrap() {
  validateBootEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureHttpApp(app);
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
}

void bootstrap();
