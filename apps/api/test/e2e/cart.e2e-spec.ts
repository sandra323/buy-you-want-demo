import { ErrorCode } from '@lightbuy/shared';
import request from 'supertest';
import { PRODUCT_STATUS_OFF } from '../../src/products/product.entity';
import { insertProduct } from './commerce-helpers';
import { createTestApp, resetDb, type TestAppHandles } from './helpers';

describe('cart API (Task 5.1)', () => {
  let handles: TestAppHandles;
  const password = 'password123';

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
  });

  function http() {
    return request(handles.app.getHttpServer());
  }

  async function register(phone: string) {
    const res = await http().post('/api/v1/auth/register').send({
      phone,
      password,
      confirmPassword: password,
    });
    expect(res.status).toBe(200);
    return res.body.data as { accessToken: string; user: { id: string } };
  }

  it('guest cannot access cart routes', async () => {
    const get = await http().get('/api/v1/cart');
    expect(get.status).toBe(401);
    expect(get.body.code).toBe(ErrorCode.UNAUTHORIZED_MISSING);

    const post = await http()
      .post('/api/v1/cart')
      .send({ productId: 'c0ffee00-0000-4000-8000-000000000001', quantity: 1 });
    expect(post.status).toBe(401);
  });

  it('upserts lines, joins live price, and keeps invalid rows', async () => {
    const user = await register('13800001001');
    const auth = { Authorization: `Bearer ${user.accessToken}` };
    const productId = await insertProduct(handles.dataSource, {
      price: '19.90',
      stock: 5,
      name: '毛巾',
    });

    const added = await http()
      .post('/api/v1/cart')
      .set(auth)
      .send({ productId, quantity: 2 });
    expect(added.status).toBe(200);
    expect(added.body.data.items).toHaveLength(1);
    expect(added.body.data.items[0]).toMatchObject({
      productId,
      name: '毛巾',
      price: 19.9,
      quantity: 2,
      stock: 5,
      invalid: false,
    });
    expect(added.body.data.selectedAmount).toBe(39.8);

    const upsert = await http()
      .post('/api/v1/cart')
      .set(auth)
      .send({ productId, quantity: 1 });
    expect(upsert.body.data.items[0].quantity).toBe(3);

    const over = await http()
      .post('/api/v1/cart')
      .set(auth)
      .send({ productId, quantity: 10 });
    expect(over.status).toBe(409);
    expect(over.body.code).toBe(ErrorCode.CONFLICT_STOCK);

    await handles.dataSource.query(
      'UPDATE products SET status = ?, stock = 0 WHERE id = ?',
      [PRODUCT_STATUS_OFF, productId],
    );

    const listed = await http().get('/api/v1/cart').set(auth);
    expect(listed.body.data.items).toHaveLength(1);
    expect(listed.body.data.items[0].invalid).toBe(true);
    expect(listed.body.data.selectedAmount).toBe(0);

    const raise = await http()
      .patch(`/api/v1/cart/${listed.body.data.items[0].id}`)
      .set(auth)
      .send({ quantity: 4 });
    expect(raise.status).toBe(409);
    expect(raise.body.code).toBe(ErrorCode.CONFLICT_STOCK);
  });

  it('other users cart line id is 40401', async () => {
    const alice = await register('13800001002');
    const bob = await register('13800001003');
    const productId = await insertProduct(handles.dataSource, { stock: 5 });

    const bobLine = await http()
      .post('/api/v1/cart')
      .set('Authorization', `Bearer ${bob.accessToken}`)
      .send({ productId, quantity: 1 });
    const lineId = bobLine.body.data.items[0].id as string;

    const patch = await http()
      .patch(`/api/v1/cart/${lineId}`)
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send({ quantity: 1 });
    expect(patch.status).toBe(404);
    expect(patch.body.code).toBe(ErrorCode.NOT_FOUND);

    const del = await http()
      .delete(`/api/v1/cart/${lineId}`)
      .set('Authorization', `Bearer ${alice.accessToken}`);
    expect(del.status).toBe(404);
    expect(del.body.code).toBe(ErrorCode.NOT_FOUND);
  });
});
