import { decidePendingRetryOnFocus } from './pending-retry';

const action = {
  type: 'add_to_cart' as const,
  productId: 'p1',
  quantity: 2,
};

describe('decidePendingRetryOnFocus', () => {
  it('executes after login when returning to the same product', () => {
    expect(
      decidePendingRetryOnFocus({
        pending: action,
        productId: 'p1',
        awaitingLogin: true,
        isLoggedIn: true,
      }),
    ).toBe('execute');
  });

  it('clears pending when the user dismisses login', () => {
    expect(
      decidePendingRetryOnFocus({
        pending: action,
        productId: 'p1',
        awaitingLogin: true,
        isLoggedIn: false,
      }),
    ).toBe('clear');
  });

  it('ignores leftover pending on the wrong product or without a login trip', () => {
    expect(
      decidePendingRetryOnFocus({
        pending: action,
        productId: 'p2',
        awaitingLogin: true,
        isLoggedIn: true,
      }),
    ).toBe('ignore');
    expect(
      decidePendingRetryOnFocus({
        pending: action,
        productId: 'p1',
        awaitingLogin: false,
        isLoggedIn: true,
      }),
    ).toBe('ignore');
  });
});
