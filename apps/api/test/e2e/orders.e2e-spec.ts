import { ErrorCode } from '@lightbuy/shared';
import request from 'supertest';
import { OrderJobs } from '../../src/orders/order-jobs';
import { addressBody, insertProduct } from './commerce-helpers';
import { createTestApp, resetDb, type TestAppHandles } from './helpers';

describe('orders API (Tasks 5.3–5.5)', () => {
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

  async function createAddress(token: string) {
    const res = await http()
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send(addressBody());
    expect(res.status).toBe(200);
    return res.body.data.id as string;
  }

  async function salesOf(productId: string): Promise<number> {
    const rows = (await handles.dataSource.query(
      'SELECT sales FROM products WHERE id = ?',
      [productId],
    )) as Array<{ sales: number }>;
    return Number(rows[0].sales);
  }

  async function stockOf(productId: string): Promise<number> {
    const rows = (await handles.dataSource.query(
      'SELECT stock FROM products WHERE id = ?',
      [productId],
    )) as Array<{ stock: number }>;
    return Number(rows[0].stock);
  }

  it('fromCart checkout snapshots price, clears selected lines, and does not bump sales', async () => {
    const user = await register('13800003001');
    const auth = { Authorization: `Bearer ${user.accessToken}` };
    const productId = await insertProduct(handles.dataSource, {
      price: '19.90',
      stock: 5,
      sales: 7,
    });
    const addressId = await createAddress(user.accessToken);

    await http().post('/api/v1/cart').set(auth).send({ productId, quantity: 2 });

    const both = await http()
      .post('/api/v1/orders')
      .set(auth)
      .send({
        addressId,
        fromCart: true,
        items: [{ productId, quantity: 1 }],
      });
    expect(both.status).toBe(400);
    expect(both.body.code).toBe(ErrorCode.VALIDATION);

    const missingAddress = await http()
      .post('/api/v1/orders')
      .set(auth)
      .send({ addressId: 'c0ffee00-0000-4000-8000-00000000dead', fromCart: true });
    expect(missingAddress.status).toBe(404);
    expect(missingAddress.body.code).toBe(ErrorCode.NOT_FOUND);

    const created = await http()
      .post('/api/v1/orders')
      .set(auth)
      .send({ addressId, fromCart: true });
    expect(created.status).toBe(200);
    expect(created.body.data.status).toBe(0);
    expect(created.body.data.totalAmount).toBe(39.8);
    expect(created.body.data.items[0]).toMatchObject({
      productId,
      price: 19.9,
      quantity: 2,
    });
    expect(created.body.data.orderNo).toMatch(/^LB\d{20}$/);

    const cart = await http().get('/api/v1/cart').set(auth);
    expect(cart.body.data.items).toHaveLength(0);
    expect(await stockOf(productId)).toBe(3);
    expect(await salesOf(productId)).toBe(7);

    const paid = await http()
      .post(`/api/v1/orders/${created.body.data.id}/pay`)
      .set(auth);
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe(1);
    expect(await salesOf(productId)).toBe(9);

    const twice = await http()
      .post(`/api/v1/orders/${created.body.data.id}/pay`)
      .set(auth);
    expect(twice.status).toBe(409);
    expect(twice.body.code).toBe(ErrorCode.CONFLICT_STATE);
  });

  it('buy-now path works; insufficient stock rolls back with 40901', async () => {
    const user = await register('13800003002');
    const auth = { Authorization: `Bearer ${user.accessToken}` };
    const productId = await insertProduct(handles.dataSource, { stock: 1 });
    const addressId = await createAddress(user.accessToken);

    const fail = await http()
      .post('/api/v1/orders')
      .set(auth)
      .send({
        addressId,
        items: [{ productId, quantity: 2 }],
      });
    expect(fail.status).toBe(409);
    expect(fail.body.code).toBe(ErrorCode.CONFLICT_STOCK);
    expect(await stockOf(productId)).toBe(1);

    const ok = await http()
      .post('/api/v1/orders')
      .set(auth)
      .send({
        addressId,
        items: [{ productId, quantity: 1 }],
      });
    expect(ok.status).toBe(200);
    expect(await stockOf(productId)).toBe(0);
  });

  it('concurrent last-unit orders: one succeeds, one is 40901', async () => {
    const user = await register('13800003003');
    const auth = { Authorization: `Bearer ${user.accessToken}` };
    const productId = await insertProduct(handles.dataSource, { stock: 1 });
    const addressId = await createAddress(user.accessToken);

    const [a, b] = await Promise.all([
      http()
        .post('/api/v1/orders')
        .set(auth)
        .send({ addressId, items: [{ productId, quantity: 1 }] }),
      http()
        .post('/api/v1/orders')
        .set(auth)
        .send({ addressId, items: [{ productId, quantity: 1 }] }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    const codes = [a.body.code, b.body.code].sort((x, y) => x - y);
    expect(codes).toEqual([ErrorCode.OK, ErrorCode.CONFLICT_STOCK]);
    expect(await stockOf(productId)).toBe(0);

    const orderCount = (await handles.dataSource.query(
      'SELECT COUNT(*) AS n FROM orders',
    )) as Array<{ n: number | string }>;
    expect(Number(orderCount[0].n)).toBe(1);
  });

  it('cancel pending restocks; pay vs cancel race yields one 40902', async () => {
    const user = await register('13800003004');
    const auth = { Authorization: `Bearer ${user.accessToken}` };
    const productId = await insertProduct(handles.dataSource, { stock: 2 });
    const addressId = await createAddress(user.accessToken);

    const created = await http()
      .post('/api/v1/orders')
      .set(auth)
      .send({
        addressId,
        items: [{ productId, quantity: 1 }],
      });

    const cancelled = await http()
      .post(`/api/v1/orders/${created.body.data.id}/cancel`)
      .set(auth);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe(3);
    expect(await stockOf(productId)).toBe(2);

    const created2 = await http()
      .post('/api/v1/orders')
      .set(auth)
      .send({
        addressId,
        items: [{ productId, quantity: 1 }],
      });

    const [pay, cancel] = await Promise.all([
      http()
        .post(`/api/v1/orders/${created2.body.data.id}/pay`)
        .set(auth),
      http()
        .post(`/api/v1/orders/${created2.body.data.id}/cancel`)
        .set(auth),
    ]);
    const pair = [pay.status, cancel.status].sort();
    expect(pair).toEqual([200, 409]);
    const loser = pay.status === 409 ? pay : cancel;
    expect(loser.body.code).toBe(ErrorCode.CONFLICT_STATE);
  });

  it('lists paginated distinct pages and rejects pageSize > 50', async () => {
    const user = await register('13800003005');
    const auth = { Authorization: `Bearer ${user.accessToken}` };
    const productId = await insertProduct(handles.dataSource, { stock: 50 });
    const addressId = await createAddress(user.accessToken);

    for (let i = 0; i < 11; i += 1) {
      const res = await http()
        .post('/api/v1/orders')
        .set(auth)
        .send({
          addressId,
          items: [{ productId, quantity: 1 }],
        });
      expect(res.status).toBe(200);
    }

    const tooBig = await http().get('/api/v1/orders?pageSize=51').set(auth);
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.code).toBe(ErrorCode.VALIDATION);

    const page1 = await http().get('/api/v1/orders?page=1&pageSize=10').set(auth);
    const page2 = await http().get('/api/v1/orders?page=2&pageSize=10').set(auth);
    expect(page1.body.data.items).toHaveLength(10);
    expect(page2.body.data.items).toHaveLength(1);
    expect(page1.body.data.total).toBe(11);
    const ids1 = page1.body.data.items.map((row: { id: string }) => row.id);
    const ids2 = page2.body.data.items.map((row: { id: string }) => row.id);
    expect(ids1).not.toEqual(expect.arrayContaining(ids2));
  });

  it('tick(now) cancels unpaid and completes paid without sleeping', async () => {
    const user = await register('13800003006');
    const auth = { Authorization: `Bearer ${user.accessToken}` };
    const productId = await insertProduct(handles.dataSource, { stock: 5 });
    const addressId = await createAddress(user.accessToken);
    const jobs = handles.app.get(OrderJobs);

    const unpaid = await http()
      .post('/api/v1/orders')
      .set(auth)
      .send({
        addressId,
        items: [{ productId, quantity: 1 }],
      });
    const paid = await http()
      .post('/api/v1/orders')
      .set(auth)
      .send({
        addressId,
        items: [{ productId, quantity: 1 }],
      });
    await http().post(`/api/v1/orders/${paid.body.data.id}/pay`).set(auth);

    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    await handles.dataSource.query(
      'UPDATE orders SET created_at = ? WHERE id = ?',
      [createdAt, unpaid.body.data.id],
    );
    await handles.dataSource.query(
      'UPDATE orders SET paid_at = ? WHERE id = ?',
      [createdAt, paid.body.data.id],
    );

    await jobs.tick(new Date('2026-01-01T00:01:01.000Z'));
    const unpaidAfter = await http()
      .get(`/api/v1/orders/${unpaid.body.data.id}`)
      .set(auth);
    expect(unpaidAfter.body.data.status).toBe(3);
    expect(await stockOf(productId)).toBe(4);

    await jobs.tick(new Date('2026-01-01T00:10:01.000Z'));
    const paidAfter = await http()
      .get(`/api/v1/orders/${paid.body.data.id}`)
      .set(auth);
    expect(paidAfter.body.data.status).toBe(2);

    const stockBefore = await stockOf(productId);
    await jobs.tick(new Date('2026-01-01T01:00:00.000Z'));
    expect(await stockOf(productId)).toBe(stockBefore);
    const unpaidAgain = await http()
      .get(`/api/v1/orders/${unpaid.body.data.id}`)
      .set(auth);
    expect(unpaidAgain.body.data.status).toBe(3);
  });
});
