import { randomUUID } from 'crypto';
import { ErrorCode, ProductSort } from '@lightbuy/shared';
import request from 'supertest';
import { runSeed } from '../../src/database/seed';
import {
  documentedApiPath,
  swaggerJsonPath,
} from '../../src/http/setup-swagger';
import { PRODUCT_STATUS_OFF } from '../../src/products/product.entity';
import { createTestApp, resetDb, type TestAppHandles } from './helpers';

const TOWEL_ID = 'c0ffee00-0000-4000-8000-000000000001';

describe('catalog API (M4)', () => {
  let handles: TestAppHandles;

  beforeAll(async () => {
    handles = await createTestApp();
  });

  afterAll(async () => {
    if (handles?.app) {
      await handles.app.close();
    }
  });

  beforeEach(async () => {
    await resetDb(handles.dataSource);
    await runSeed(handles.dataSource);
  });

  it('GET /api/v1/home and /products return on-sale cards, default comprehensive', async () => {
    const home = await request(handles.app.getHttpServer()).get('/api/v1/home');
    const products = await request(handles.app.getHttpServer()).get(
      '/api/v1/products',
    );

    expect(home.status).toBe(200);
    expect(products.status).toBe(200);
    expect(home.body.code).toBe(ErrorCode.OK);
    expect(home.body.data.items.length).toBeGreaterThan(0);
    expect(home.body.data.page).toBe(1);
    expect(home.body.data.pageSize).toBe(10);

    const sales = home.body.data.items.map(
      (item: { sales: number }) => item.sales,
    );
    const sorted = [...sales].sort((a, b) => b - a);
    expect(sales).toEqual(sorted);
    expect(home.body.data.items[0].id).toBe(products.body.data.items[0].id);
    expect(home.body.data.items[0]).not.toHaveProperty('description');
  });

  it('honors sort=newest and clamps pagination via validation', async () => {
    const newest = await request(handles.app.getHttpServer()).get(
      `/api/v1/products?sort=${ProductSort.Newest}&pageSize=5`,
    );
    expect(newest.status).toBe(200);
    expect(newest.body.data.items).toHaveLength(5);

    const tooBig = await request(handles.app.getHttpServer()).get(
      '/api/v1/products?pageSize=51',
    );
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.code).toBe(ErrorCode.VALIDATION);
  });

  it('keyword match filters; % does not match every row; miss sets isFallback', async () => {
    const all = await request(handles.app.getHttpServer()).get(
      '/api/v1/products',
    );
    const catalogTotal = all.body.data.total as number;

    const hit = await request(handles.app.getHttpServer()).get(
      encodeURI('/api/v1/products?keyword=纯棉'),
    );
    expect(hit.status).toBe(200);
    expect(hit.body.data.isFallback).toBeUndefined();
    expect(
      hit.body.data.items.every((item: { name: string }) =>
        item.name.includes('纯棉'),
      ),
    ).toBe(true);

    const wildcard = await request(handles.app.getHttpServer()).get(
      '/api/v1/products?keyword=%25',
    );
    expect(wildcard.status).toBe(200);
    expect(wildcard.body.data.isFallback).toBeUndefined();
    expect(wildcard.body.data.total).toBeGreaterThan(0);
    expect(wildcard.body.data.total).toBeLessThan(catalogTotal);
    expect(
      wildcard.body.data.items.every((item: { name: string }) =>
        item.name.includes('%'),
      ),
    ).toBe(true);

    const miss = await request(handles.app.getHttpServer()).get(
      '/api/v1/products?keyword=no-such-sku-zzzz&page=5',
    );
    expect(miss.status).toBe(200);
    expect(miss.body.data.isFallback).toBe(true);
    expect(miss.body.data.page).toBe(1);
    expect(miss.body.data.items.length).toBeGreaterThan(0);
    expect(miss.body.data.items[0].isFallback).toBe(true);

    const hitIgnoreSort = await request(handles.app.getHttpServer()).get(
      encodeURI(`/api/v1/products?keyword=纯棉&sort=${ProductSort.PriceAsc}`),
    );
    const sales = hitIgnoreSort.body.data.items.map(
      (item: { sales: number }) => item.sales,
    );
    expect([...sales].sort((a, b) => b - a)).toEqual(sales);
  });

  it('GET /products/:id returns detail; missing or off-shelf is 40401', async () => {
    const ok = await request(handles.app.getHttpServer()).get(
      `/api/v1/products/${TOWEL_ID}`,
    );
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({
      id: TOWEL_ID,
      name: '100% 纯棉毛巾',
      status: 1,
    });
    expect(typeof ok.body.data.description).toBe('string');
    expect(Array.isArray(ok.body.data.images)).toBe(true);

    const missing = await request(handles.app.getHttpServer()).get(
      `/api/v1/products/${randomUUID()}`,
    );
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({
      code: ErrorCode.NOT_FOUND,
      message: '资源不存在',
      data: null,
    });

    await handles.dataSource.query(
      'UPDATE products SET status = ? WHERE id = ?',
      [PRODUCT_STATUS_OFF, TOWEL_ID],
    );
    const off = await request(handles.app.getHttpServer()).get(
      `/api/v1/products/${TOWEL_ID}`,
    );
    expect(off.status).toBe(404);
    expect(off.body.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('Swagger lists catalog routes with query params', async () => {
    const spec = await request(handles.app.getHttpServer()).get(
      swaggerJsonPath(),
    );
    expect(spec.status).toBe(200);
    const paths = spec.body.paths as Record<
      string,
      { get?: { parameters?: Array<{ name: string }> } }
    >;
    expect(paths[documentedApiPath('/home')]).toBeDefined();
    expect(paths[documentedApiPath('/products')]).toBeDefined();
    expect(paths[documentedApiPath('/products/{id}')]).toBeDefined();
    const names = (
      paths[documentedApiPath('/products')]?.get?.parameters ?? []
    ).map((p) => p.name);
    expect(names).toEqual(
      expect.arrayContaining(['sort', 'page', 'pageSize', 'keyword']),
    );
  });
});
