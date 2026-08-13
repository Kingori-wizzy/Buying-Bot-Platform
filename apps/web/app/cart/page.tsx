'use client';

import {
  type CartView,
  formatMoneyMinor,
  PlatformApiError,
} from '@buying-bot/sdk';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { cartSubtotalMinor, createBrowserSdk } from '@/lib/api';

export default function CartPage() {
  const [cart, setCart] = useState<CartView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await createBrowserSdk().getCart();
      setCart(next);
      setError(null);
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Cart load failed',
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateQty(lineId: string, quantity: number) {
    setBusy(true);
    try {
      const next = await createBrowserSdk().updateCartItem(lineId, {
        quantity,
      });
      setCart(next);
    } catch (err) {
      setError(err instanceof PlatformApiError ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(lineId: string) {
    setBusy(true);
    try {
      const next = await createBrowserSdk().removeCartItem(lineId);
      setCart(next);
    } catch (err) {
      setError(err instanceof PlatformApiError ? err.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  }

  const subtotal = cart ? cartSubtotalMinor(cart.lines) : 0;

  return (
    <section className="stack">
      <h1>Cart</h1>
      {error ? <p className="error">{error}</p> : null}
      {!cart ? <p className="muted">Loading…</p> : null}
      {cart?.lines.length === 0 ? (
        <p className="muted">Your cart is empty.</p>
      ) : null}
      {cart && cart.lines.length > 0 ? (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Line</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cart.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.productName}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      defaultValue={line.quantity}
                      disabled={busy}
                      onBlur={(e) => {
                        const qty = Number(e.target.value);
                        if (qty >= 1 && qty !== line.quantity) {
                          void updateQty(line.id, qty);
                        }
                      }}
                      style={{ width: '4rem' }}
                    />
                  </td>
                  <td>
                    {formatMoneyMinor(line.unitPriceMinor, line.currency)}
                  </td>
                  <td>
                    {formatMoneyMinor(line.lineTotalMinor, line.currency)}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void remove(line.id);
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="price">
            Subtotal (API): {formatMoneyMinor(subtotal, cart.currency)}
          </p>
          <Link className="btn" href="/checkout">
            Checkout
          </Link>
        </>
      ) : null}
    </section>
  );
}
