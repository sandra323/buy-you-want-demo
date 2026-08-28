import { saveTokens, getAccessToken, getRefreshToken } from '../storage/tokens';
import { SEARCH_HISTORY_KEY } from '../storage/search-history';
import { useAuthStore } from './auth';
import { useCartBadgeStore } from './cart-badge';
import { __resetSecureStore } from '../test/mocks/expo-secure-store';
import {
  __resetAsyncStorage,
  setItem,
  getItem,
} from '../test/mocks/async-storage';

const USER = {
  id: 'u1',
  phoneMask: '138****0000',
  nickname: 'demo',
  avatar: '',
};

describe('auth store', () => {
  beforeEach(async () => {
    __resetSecureStore();
    __resetAsyncStorage();
    useCartBadgeStore.getState().reset();
    await useAuthStore.getState().logoutLocal();
    useAuthStore.setState({ isHydrating: false });
  });

  it('keeps tokens in SecureStore, not in a persist snapshot', async () => {
    await saveTokens('a', 'r');
    useAuthStore.getState().setSession(USER, 'a');

    expect(await getAccessToken()).toBe('a');
    expect(await getRefreshToken()).toBe('r');
    expect(useAuthStore.getState()).not.toHaveProperty('refreshToken');
  });

  it('logoutLocal clears memory, SecureStore, search history, and cart badge', async () => {
    await saveTokens('a', 'r');
    useAuthStore.getState().setSession(USER, 'a');
    useCartBadgeStore.getState().setCount(3);
    await setItem(SEARCH_HISTORY_KEY, JSON.stringify(['毛巾']));

    await useAuthStore.getState().logoutLocal();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
    expect(await getItem(SEARCH_HISTORY_KEY)).toBeNull();
    expect(useCartBadgeStore.getState().count).toBe(0);
  });
});
