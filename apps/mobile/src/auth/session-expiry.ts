import { useToastStore } from '../store/toast';

const CHECKOUT_EXPIRED_COPY = '登录已过期，请重新登录';

type SessionExpiryHandler = {
  getRouteName: () => string | undefined;
  navigateLogin: () => void;
};

let handler: SessionExpiryHandler | null = null;

export function setSessionExpiryHandler(
  next: SessionExpiryHandler | null,
): void {
  handler = next;
}

/** Checkout/pay is the only surface that must prompt re-login after refresh death. */
export function notifyCheckoutLoginExpired(): void {
  const route = handler?.getRouteName();
  if (route !== 'Checkout') {
    return;
  }
  useToastStore.getState().show(CHECKOUT_EXPIRED_COPY);
  handler?.navigateLogin();
}
