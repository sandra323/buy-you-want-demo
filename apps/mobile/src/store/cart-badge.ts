import { create } from 'zustand';

type CartBadgeState = {
  count: number;
  setCount: (count: number) => void;
  reset: () => void;
};

export const useCartBadgeStore = create<CartBadgeState>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
  reset: () => set({ count: 0 }),
}));
