import { Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import request from 'supertest';
import { API_GLOBAL_PREFIX } from './api-prefix';
import {
  documentedApiPath,
  setupSwagger,
  swaggerJsonPath,
  swaggerUiPath,
  SWAGGER_BEARER_AUTH,
} from './setup-swagger';

@ApiTags('auth')
@Controller('auth')
class AuthDocController {
  @Post('login')
  login() {
    return {};
  }

  @Get('session')
  @ApiExcludeEndpoint()
  session() {
    return {};
  }
}

@ApiTags('users')
@ApiBearerAuth(SWAGGER_BEARER_AUTH)
@Controller('users')
class UsersDocController {
  @Get('me')
  me() {
    return {};
  }
}

describe('setupSwagger', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthDocController, UsersDocController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_GLOBAL_PREFIX);
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves Swagger UI at /api/docs (not under /api/v1)', async () => {
    const res = await request(app.getHttpServer()).get(swaggerUiPath());
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/swagger/i);
  });

  it('documents auth + users with bearer scheme; hides session probe', async () => {
    const res = await request(app.getHttpServer()).get(swaggerJsonPath());
    expect(res.status).toBe(200);

    const spec = res.body as {
      paths: Record<string, unknown>;
      components?: { securitySchemes?: Record<string, unknown> };
    };

    expect(spec.paths[documentedApiPath('/auth/login')]).toBeDefined();
    expect(spec.paths[documentedApiPath('/users/me')]).toBeDefined();
    expect(spec.paths[documentedApiPath('/auth/session')]).toBeUndefined();
    expect(spec.components?.securitySchemes?.[SWAGGER_BEARER_AUTH]).toEqual(
      expect.objectContaining({ type: 'http', scheme: 'bearer' }),
    );
  });
});
