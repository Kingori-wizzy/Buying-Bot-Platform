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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const next = await createBrowserSdk().getCart();
      setCart(next);
      setError(null);
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Cart load failed',
      );
    } finally {
      setLoading(false);
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
    <main className="page" id="main">
      <section className="stack">
        <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>Cart</h1>
        <p className="muted" style={{ margin: 0 }}>
          Line totals come from the cart API (server-priced). Checkout may
          re-resolve promotions and tax.
        </p>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <div className="skeleton" style={{ height: 120 }} /> : null}
        {!loading && cart?.lines.length === 0 ? (
          <div className="empty-state">
            <p>Your cart is empty.</p>
            <Link className="btn" href="/products">
              Continue shopping
            </Link>
          </div>
        ) : null}
        {cart && cart.lines.length > 0 ? (
          <div className="panel stack">
            {cart.lines.map((line) => (
              <div className="cart-line" key={line.id}>
                <div className="cart-thumb" aria-hidden />
                <div>
                  <strong>{line.productName}</strong>
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {formatMoneyMinor(line.unitPriceMinor, line.currency)} each
                  </p>
                </div>
                <div className="line-actions stack" style={{ gap: '0.45rem' }}>
                  <div className="qty-controls">
                    <label className="sr-only" htmlFor={`qty-${line.id}`}>
                      Quantity for {line.productName}
                    </label>
                    <button
                      className="qty-btn"
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={busy || line.quantity <= 1}
                      onClick={() => {
                        void updateQty(line.id, line.quantity - 1);
                      }}
                    >
                      −
                    </button>
                    <input
                      id={`qty-${line.id}`}
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
                    />
                    <button
                      className="qty-btn"
                      type="button"
                      aria-label="Increase quantity"
                      disabled={busy || line.quantity >= 100}
                      onClick={() => {
                        void updateQty(line.id, line.quantity + 1);
                      }}
                    >
                      +
                    </button>
                    <span className="price">
                      {formatMoneyMinor(line.lineTotalMinor, line.currency)}
                    </span>
                  </div>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={busy}
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => {
                      void remove(line.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <div className="section-head">
              <div>
                <p className="muted" style={{ margin: 0 }}>
                  Cart subtotal (from API line totals)
                </p>
                <p className="price" style={{ fontSize: '1.35rem', margin: 0 }}>
                  {formatMoneyMinor(subtotal, cart.currency)}
                </p>
              </div>
              <Link className="btn" href="/checkout">
                Proceed to checkout
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
