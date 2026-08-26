/** Browser event so the header badge refreshes after cart mutations. */
export const CART_CHANGED_EVENT = 'bb:cart-changed';

export function notifyCartChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}
