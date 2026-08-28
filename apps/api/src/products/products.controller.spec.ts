import { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ErrorCode, ProductSort } from '@lightbuy/shared';
import request from 'supertest';
import { AllExceptionsFilter } from '../http/all-exceptions.filter';
import { createValidationPipe } from '../http/configure-http-app';
import {
  documentedApiPath,
  setupSwagger,
  swaggerJsonPath,
} from '../http/setup-swagger';
import { TransformInterceptor } from '../http/transform.interceptor';
import { HomeController } from './home.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('catalog controllers', () => {
  let app: INestApplication;
  const list = jest.fn();
  const getById = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HomeController, ProductsController],
      providers: [
        { provide: ProductsService, useValue: { list, getById } },
        { provide: APP_PIPE, useFactory: createValidationPipe },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    list.mockReset();
    getById.mockReset();
  });

  it('GET /home and /products share the list service without requiring auth', async () => {
    list.mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0 });

    const home = await request(app.getHttpServer()).get('/api/v1/home');
    const products = await request(app.getHttpServer()).get('/api/v1/products');

    expect(home.status).toBe(200);
    expect(products.status).toBe(200);
    expect(home.body.code).toBe(ErrorCode.OK);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('rejects pageSize above 50 with 40001', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/products?pageSize=51',
    );
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: ErrorCode.VALIDATION,
      message: '参数校验失败',
      data: null,
    });
    expect(list).not.toHaveBeenCalled();
  });

  it('forwards keyword and sort to the service', async () => {
    list.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
      isFallback: true,
    });

    const res = await request(app.getHttpServer()).get(
      '/api/v1/products?keyword=毛巾&sort=sales',
    );
    expect(res.status).toBe(200);
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: '毛巾',
        sort: ProductSort.Sales,
      }),
    );
  });

  it('GET /products/:id returns service detail', async () => {
    getById.mockResolvedValue({
      id: 'p1',
      name: 'x',
      price: 1,
      originalPrice: null,
      mainImage: 'https://example.com/a.jpg',
      sales: 0,
      stock: 1,
      images: [],
      description: 'plain',
      status: 1,
    });

    const res = await request(app.getHttpServer()).get('/api/v1/products/p1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('p1');
    expect(getById).toHaveBeenCalledWith('p1');
  });

  it('documents home, products list, and product detail in Swagger', async () => {
    const res = await request(app.getHttpServer()).get(swaggerJsonPath());
    expect(res.status).toBe(200);
    const paths = res.body.paths as Record<
      string,
      { get?: { parameters?: unknown[] } }
    >;

    expect(paths[documentedApiPath('/home')]).toBeDefined();
    expect(paths[documentedApiPath('/products')]).toBeDefined();
    expect(paths[documentedApiPath('/products/{id}')]).toBeDefined();

    const listParams =
      paths[documentedApiPath('/products')]?.get?.parameters ?? [];
    const names = (listParams as Array<{ name: string }>).map((p) => p.name);
    expect(names).toEqual(
      expect.arrayContaining(['sort', 'page', 'pageSize', 'keyword']),
    );
  });
});
