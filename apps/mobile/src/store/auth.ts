import { create } from 'zustand';
import type { User } from '@lightbuy/shared';

import { clearSearchHistory } from '../storage/search-history';
import { clearTokens } from '../storage/tokens';
import { useCartBadgeStore } from './cart-badge';

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isHydrating: boolean;
  setSession: (user: User, accessToken: string) => void;
  setHydrating: (isHydrating: boolean) => void;
  logoutLocal: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  // Avoid Cart/Me LoginGate flash before silent refresh finishes.
  isHydrating: true,
  setSession: (user, accessToken) => set({ user, accessToken }),
  setHydrating: (isHydrating) => set({ isHydrating }),
  logoutLocal: async () => {
    set({ user: null, accessToken: null });
    await clearTokens();
    await clearSearchHistory();
    useCartBadgeStore.getState().reset();
  },
}));
