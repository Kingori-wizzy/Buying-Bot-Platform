'use client';

import {
  type CartView,
  formatMoneyMinor,
  PlatformApiError,
} from '@buying-bot/sdk';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cartSubtotalMinor, createBrowserSdk } from '@/lib/api';

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `checkout-${String(Date.now())}`;
}

const STEPS = ['Cart review', 'Delivery', 'Confirm & escrow'] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState<CartView | null>(null);
  const [coupon, setCoupon] = useState('');
  const [shippingMethodCode, setShippingMethodCode] = useState('FLAT');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCart = useCallback(async () => {
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
    void loadCart();
  }, [loadCart]);

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const returnUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/orders`
          : undefined;
      const result = (await createBrowserSdk().checkout(
        {
          shippingMethodCode,
          ...(coupon.trim() ? { couponCode: coupon.trim() } : {}),
          ...(returnUrl ? { returnUrl } : {}),
        },
        newIdempotencyKey(),
      )) as { id?: string; orderId?: string };

      const orderId = result.id ?? result.orderId;
      if (!orderId) {
        setError('Checkout succeeded but no order id was returned');
        return;
      }
      router.push(`/orders/${orderId}`);
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Checkout failed',
      );
    } finally {
      setBusy(false);
    }
  }

  const subtotal = cart ? cartSubtotalMinor(cart.lines) : 0;

  return (
    <main className="page" id="main">
      <section className="stack">
        <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>Checkout</h1>
        <p className="muted" style={{ margin: 0 }}>
          Prices, discounts, tax, inventory, and payable amount are resolved by
          the API. Payment is via escrow when configured.
        </p>

        <div className="steps" aria-label="Checkout steps">
          {STEPS.map((label, index) => (
            <span
              key={label}
              className={index === step ? 'step-pill active' : 'step-pill'}
            >
              {index + 1}. {label}
            </span>
          ))}
        </div>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <div className="skeleton" style={{ height: 100 }} /> : null}

        {!loading && cart?.lines.length === 0 ? (
          <div className="empty-state">
            <p>Add items before checkout.</p>
            <Link className="btn" href="/products">
              Browse products
            </Link>
          </div>
        ) : null}

        {cart && cart.lines.length > 0 && step === 0 ? (
          <div className="panel stack">
            <h2 style={{ margin: 0 }}>Review cart</h2>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {cart.lines.map((line) => (
                <li key={line.id}>
                  {line.productName} × {line.quantity} —{' '}
                  {formatMoneyMinor(line.lineTotalMinor, line.currency)}
                </li>
              ))}
            </ul>
            <p className="price">
              Display subtotal: {formatMoneyMinor(subtotal, cart.currency)} (API
              line totals)
            </p>
            <div className="cta-row">
              <Link className="btn btn-secondary" href="/cart">
                Edit cart
              </Link>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setStep(1);
                }}
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {cart && cart.lines.length > 0 && step === 1 ? (
          <form
            className="panel stack"
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
          >
            <h2 style={{ margin: 0 }}>Delivery</h2>
            <p className="muted" style={{ margin: 0 }}>
              Choose shipping. Payment will use escrow — not M-Pesa.
            </p>
            <div className="field">
              <label htmlFor="shipping">Shipping method code</label>
              <input
                id="shipping"
                value={shippingMethodCode}
                onChange={(e) => {
                  setShippingMethodCode(e.target.value);
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="coupon">Coupon (optional)</label>
              <input
                id="coupon"
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value);
                }}
              />
            </div>
            <div className="cta-row">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setStep(0);
                }}
              >
                Back
              </button>
              <button className="btn" type="submit">
                Review &amp; pay with escrow
              </button>
            </div>
          </form>
        ) : null}

        {cart && cart.lines.length > 0 && step === 2 ? (
          <form
            className="panel stack"
            onSubmit={(e) => {
              void onSubmit(e);
            }}
          >
            <h2 style={{ margin: 0 }}>Confirm &amp; start escrow</h2>
            <div className="alert alert-warning">
              Placing the order creates a <strong>PENDING_PAYMENT</strong>{' '}
              order. Escrow confirmation comes only from a verified provider
              webhook — never from this button alone. If escrow credentials are
              not configured on the server, payment initiation fails safely.
            </div>
            <p>
              <strong>Payment method:</strong> Escrow
            </p>
            <p>
              <strong>Shipping code:</strong> {shippingMethodCode}
            </p>
            {coupon.trim() ? (
              <p>
                <strong>Coupon:</strong> {coupon.trim()}
              </p>
            ) : null}
            <p className="price">
              Display subtotal: {formatMoneyMinor(subtotal, cart.currency)}
            </p>
            <div className="cta-row">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setStep(1);
                }}
              >
                Back
              </button>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? 'Placing order…' : 'Place order & start escrow'}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </main>
  );
}
