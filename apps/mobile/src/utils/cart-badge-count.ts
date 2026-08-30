import type { CartItem } from '@lightbuy/shared';

export function cartBadgeCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}
