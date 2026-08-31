import { ErrorCode } from '@lightbuy/shared';
import request from 'supertest';
import {
  documentedApiPath,
  swaggerJsonPath,
} from '../../src/http/setup-swagger';
import { OrderJobs } from '../../src/orders/order-jobs';
import { addressBody, insertProduct } from './commerce-helpers';
import { createTestApp, resetDb, type TestAppHandles } from './helpers';

describe('commerce flow + IDOR (Tasks 5.6–5.7)', () => {
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
    return res.body.data as { accessToken: string };
  }

  it('user A cannot read user B order, cart line, or address', async () => {
    const alice = await register('13800004001');
    const bob = await register('13800004002');
    const productId = await insertProduct(handles.dataSource, { stock: 3 });

    const bobAuth = { Authorization: `Bearer ${bob.accessToken}` };
    const aliceAuth = { Authorization: `Bearer ${alice.accessToken}` };

    const address = await http()
      .post('/api/v1/addresses')
      .set(bobAuth)
      .send(addressBody());
    const cart = await http()
      .post('/api/v1/cart')
      .set(bobAuth)
      .send({ productId, quantity: 1 });
    const order = await http()
      .post('/api/v1/orders')
      .set(bobAuth)
      .send({ addressId: address.body.data.id, fromCart: true });

    const orderGet = await http()
      .get(`/api/v1/orders/${order.body.data.id}`)
      .set(aliceAuth);
    const orderPay = await http()
      .post(`/api/v1/orders/${order.body.data.id}/pay`)
      .set(aliceAuth);
    const cartPatch = await http()
      .patch(`/api/v1/cart/${cart.body.data.items[0].id}`)
      .set(aliceAuth)
      .send({ selected: false });
    const addrDel = await http()
      .delete(`/api/v1/addresses/${address.body.data.id}`)
      .set(aliceAuth);

    for (const res of [orderGet, orderPay, cartPatch, addrDel]) {
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(ErrorCode.NOT_FOUND);
    }
  });

  it('register → cart → order → pay → tick completes', async () => {
    const user = await register('13800004003');
    const auth = { Authorization: `Bearer ${user.accessToken}` };
    const productId = await insertProduct(handles.dataSource, {
      price: '10.00',
      stock: 4,
    });

    const address = await http()
      .post('/api/v1/addresses')
      .set(auth)
      .send(addressBody());
    await http()
      .post('/api/v1/cart')
      .set(auth)
      .send({ productId, quantity: 1 });

    const created = await http()
      .post('/api/v1/orders')
      .set(auth)
      .send({ addressId: address.body.data.id, fromCart: true });
    expect(created.status).toBe(200);
    expect(created.body.data.status).toBe(0);

    const paid = await http()
      .post(`/api/v1/orders/${created.body.data.id}/pay`)
      .set(auth);
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe(1);

    await handles.dataSource.query(
      'UPDATE orders SET paid_at = ? WHERE id = ?',
      [new Date('2026-01-01T00:00:00.000Z'), created.body.data.id],
    );

    await handles.app.get(OrderJobs).tick(new Date('2026-01-01T00:08:01.000Z'));

    const awaitingReceipt = await http()
      .get(`/api/v1/orders/${created.body.data.id}`)
      .set(auth);
    expect(awaitingReceipt.body.data.status).toBe(4);

    await handles.app.get(OrderJobs).tick(new Date('2026-01-01T00:13:02.000Z'));

    const detail = await http()
      .get(`/api/v1/orders/${created.body.data.id}`)
      .set(auth);
    expect(detail.body.data.status).toBe(2);
  });

  it('Swagger documents cart, addresses, and order create/pay/cancel/list/detail', async () => {
    const res = await http().get(swaggerJsonPath());
    expect(res.status).toBe(200);
    const paths = res.body.paths as Record<string, unknown>;

    expect(paths[documentedApiPath('/cart')]).toBeDefined();
    expect(paths[documentedApiPath('/cart/{id}')]).toBeDefined();
    expect(paths[documentedApiPath('/addresses')]).toBeDefined();
    expect(paths[documentedApiPath('/addresses/{id}')]).toBeDefined();
    expect(paths[documentedApiPath('/orders')]).toBeDefined();
    expect(paths[documentedApiPath('/orders/{id}')]).toBeDefined();
    expect(paths[documentedApiPath('/orders/{id}/pay')]).toBeDefined();
    expect(paths[documentedApiPath('/orders/{id}/cancel')]).toBeDefined();
  });
});
