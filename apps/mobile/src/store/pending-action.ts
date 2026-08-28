import { create } from 'zustand';

/** 登录成功后源页按此重试（完整接线在 Task 8.3）。 */
export type PendingAction = {
  type: 'add_to_cart' | 'buy_now';
  productId: string;
  quantity: number;
};

type PendingActionState = {
  pendingAction: PendingAction | null;
  setPendingAction: (action: PendingAction) => void;
  clearPendingAction: () => void;
};

export const usePendingActionStore = create<PendingActionState>((set) => ({
  pendingAction: null,
  setPendingAction: (pendingAction) => set({ pendingAction }),
  clearPendingAction: () => set({ pendingAction: null }),
}));
