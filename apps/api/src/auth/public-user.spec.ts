import { maskPhone, defaultNickname, toPublicUser } from './public-user';
import { USER_STATUS_ACTIVE } from '../users/user.entity';

describe('public user helpers', () => {
  it('masks phone as 138****0000', () => {
    expect(maskPhone('13800000000')).toBe('138****0000');
  });

  it('builds nickname from last 4 digits', () => {
    expect(defaultNickname('13800000000')).toBe('用户0000');
  });

  it('maps null avatar to empty string', () => {
    expect(
      toPublicUser({
        id: 'u1',
        phone: '13800000000',
        passwordHash: 'x',
        nickname: '用户0000',
        avatar: null,
        status: USER_STATUS_ACTIVE,
      } as never),
    ).toEqual({
      id: 'u1',
      phoneMask: '138****0000',
      nickname: '用户0000',
      avatar: '',
    });
  });
});
