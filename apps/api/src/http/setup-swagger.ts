import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_GLOBAL_PREFIX } from './api-prefix';

/** Swagger Authorize 与 @ApiBearerAuth 共用的 scheme 名。 */
export const SWAGGER_BEARER_AUTH = 'access-token';

export const SWAGGER_PATH = 'api/docs';

/** 挂在全局前缀之外，避免变成 /api/v1/docs。 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('LightBuy API')
    .setDescription(
      '评审用文档。成功/失败都是 `{ code, message, data }` envelope；' +
        '受保护接口点 Authorize 填入登录返回的 accessToken。' +
        '错误走全局过滤器，不会把堆栈写进响应。',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access JWT（Authorization: Bearer）',
      },
      SWAGGER_BEARER_AUTH,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: false,
  });
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    customSiteTitle: 'LightBuy API',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

export function swaggerUiPath(): string {
  return `/${SWAGGER_PATH}`;
}

export function swaggerJsonPath(): string {
  return `/${SWAGGER_PATH}-json`;
}

/** 文档里的业务路径带 `/api/v1`。 */
export function documentedApiPath(relative: string): string {
  const path = relative.startsWith('/') ? relative : `/${relative}`;
  return `/${API_GLOBAL_PREFIX}${path}`;
}
