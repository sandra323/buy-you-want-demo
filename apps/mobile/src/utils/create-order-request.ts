import type { CreateOrderRequest } from '@lightbuy/shared';

export type CheckoutSource =
  | { source: 'cart' }
  | { source: 'buyNow'; productId: string; quantity: number };

export function buildCreateOrderRequest(
  addressId: string,
  source: CheckoutSource,
): CreateOrderRequest {
  if (source.source === 'cart') {
    return { addressId, fromCart: true };
  }
  return {
    addressId,
    items: [{ productId: source.productId, quantity: source.quantity }],
  };
}
