import { useCartAnimationStore } from './cart-animation';

describe('cart animation store', () => {
  beforeEach(() => {
    useCartAnimationStore.setState({
      target: null,
      flight: null,
      pulseId: 0,
    });
  });

  it('always pulses but only flies when both measured points exist', () => {
    useCartAnimationStore.getState().notifyAddSuccess(null);
    expect(useCartAnimationStore.getState().pulseId).toBe(1);
    expect(useCartAnimationStore.getState().flight).toBeNull();

    useCartAnimationStore.getState().setTarget({ x: 300, y: 700 });
    useCartAnimationStore.getState().notifyAddSuccess({ x: 100, y: 500 });

    expect(useCartAnimationStore.getState().pulseId).toBe(2);
    expect(useCartAnimationStore.getState().flight).toEqual({
      id: 2,
      start: { x: 100, y: 500 },
      end: { x: 300, y: 700 },
    });
  });
});
