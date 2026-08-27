import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  it('GET me loads the profile from the database via UsersService', async () => {
    const getMe = jest.fn().mockResolvedValue({
      id: 'u1',
      phoneMask: '138****0000',
      nickname: '用户0000',
      avatar: '',
    });
    const controller = new UsersController({
      getMe,
    } as unknown as UsersService);

    await expect(controller.me({ id: 'u1' })).resolves.toEqual({
      id: 'u1',
      phoneMask: '138****0000',
      nickname: '用户0000',
      avatar: '',
    });
    expect(getMe).toHaveBeenCalledWith('u1');
  });
});
