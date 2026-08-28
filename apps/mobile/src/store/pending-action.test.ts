import { usePendingActionStore } from './pending-action';

describe('pendingAction store', () => {
  beforeEach(() => {
    usePendingActionStore.getState().clearPendingAction();
  });

  it('sets and clears without throwing', () => {
    const action = {
      type: 'add_to_cart' as const,
      productId: 'p1',
      quantity: 2,
    };

    usePendingActionStore.getState().setPendingAction(action);
    expect(usePendingActionStore.getState().pendingAction).toEqual(action);

    usePendingActionStore.getState().clearPendingAction();
    expect(usePendingActionStore.getState().pendingAction).toBeNull();
  });
});
