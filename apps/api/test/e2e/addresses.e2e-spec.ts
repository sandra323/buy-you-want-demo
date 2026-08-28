import { ErrorCode } from '@lightbuy/shared';
import request from 'supertest';
import { addressBody } from './commerce-helpers';
import { createTestApp, resetDb, type TestAppHandles } from './helpers';

describe('addresses API (Task 5.2)', () => {
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

  it('auto-defaults the first address, lists default first, and promotes on delete', async () => {
    const user = await register('13800002001');
    const auth = { Authorization: `Bearer ${user.accessToken}` };

    const first = await http()
      .post('/api/v1/addresses')
      .set(auth)
      .send(addressBody({ receiverName: '甲', isDefault: false }));
    expect(first.status).toBe(200);
    expect(first.body.data.isDefault).toBe(true);

    const second = await http()
      .post('/api/v1/addresses')
      .set(auth)
      .send(addressBody({ receiverName: '乙', phone: '13800002002' }));
    expect(second.body.data.isDefault).toBe(false);

    await http()
      .put(`/api/v1/addresses/${second.body.data.id}`)
      .set(auth)
      .send(
        addressBody({
          receiverName: '乙',
          phone: '13800002002',
          isDefault: true,
        }),
      );

    const listed = await http().get('/api/v1/addresses').set(auth);
    expect(listed.body.data[0].id).toBe(second.body.data.id);
    expect(listed.body.data[0].isDefault).toBe(true);
    expect(listed.body.data[1].isDefault).toBe(false);

    const deleted = await http()
      .delete(`/api/v1/addresses/${second.body.data.id}`)
      .set(auth);
    expect(deleted.status).toBe(200);

    const after = await http().get('/api/v1/addresses').set(auth);
    expect(after.body.data).toHaveLength(1);
    expect(after.body.data[0].id).toBe(first.body.data.id);
    expect(after.body.data[0].isDefault).toBe(true);
  });

  it('other users address id is 40401', async () => {
    const alice = await register('13800002003');
    const bob = await register('13800002004');
    const created = await http()
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${bob.accessToken}`)
      .send(addressBody());

    const get = await http()
      .put(`/api/v1/addresses/${created.body.data.id}`)
      .set('Authorization', `Bearer ${alice.accessToken}`)
      .send(addressBody({ receiverName: '丙' }));
    expect(get.status).toBe(404);
    expect(get.body.code).toBe(ErrorCode.NOT_FOUND);
  });
});
