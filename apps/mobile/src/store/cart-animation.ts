import { create } from 'zustand';

export type ScreenPoint = {
  x: number;
  y: number;
};

export type CartFlight = {
  id: number;
  start: ScreenPoint;
  end: ScreenPoint;
};

type CartAnimationState = {
  target: ScreenPoint | null;
  flight: CartFlight | null;
  pulseId: number;
  setTarget: (target: ScreenPoint) => void;
  notifyAddSuccess: (start: ScreenPoint | null) => void;
};

export const useCartAnimationStore = create<CartAnimationState>((set) => ({
  target: null,
  flight: null,
  pulseId: 0,
  setTarget: (target) => set({ target }),
  notifyAddSuccess: (start) =>
    set((state) => {
      const id = state.pulseId + 1;
      return {
        pulseId: id,
        flight:
          start && state.target
            ? { id, start, end: state.target }
            : state.flight,
      };
    }),
}));
