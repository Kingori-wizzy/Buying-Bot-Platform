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

const STEPS = ['Cart review', 'Delivery & M-Pesa', 'Confirm'] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState<CartView | null>(null);
  const [msisdn, setMsisdn] = useState('+2547');
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
      const result = (await createBrowserSdk().checkout(
        {
          msisdnE164: msisdn.trim(),
          shippingMethodCode,
          ...(coupon.trim() ? { couponCode: coupon.trim() } : {}),
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
          Nest is authoritative for price, discounts, tax, inventory, and
          payable amount. This page never invents totals.
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
            <h2 style={{ margin: 0 }}>Delivery &amp; M-Pesa</h2>
            <p className="muted" style={{ margin: 0 }}>
              Enter the Safaricom number that will receive the STK Push when
              payments are enabled on the server.
            </p>
            <div className="field">
              <label htmlFor="msisdn">M-Pesa MSISDN (E.164)</label>
              <input
                id="msisdn"
                value={msisdn}
                onChange={(e) => {
                  setMsisdn(e.target.value);
                }}
                required
                pattern="^\+[1-9]\d{7,14}$"
                placeholder="+2547XXXXXXXX"
              />
            </div>
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
              <label htmlFor="coupon">Coupon (optional, one code)</label>
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
                Review &amp; pay
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
            <h2 style={{ margin: 0 }}>Confirm order</h2>
            <div className="alert alert-warning">
              Placing the order creates a <strong>PENDING_PAYMENT</strong>{' '}
              order. Payment is confirmed only when the API reports a successful
              M-Pesa webhook — not when this button succeeds.
            </div>
            <p>
              <strong>Phone:</strong> {msisdn}
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
                {busy ? 'Placing order…' : 'Place order & await M-Pesa'}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </main>
  );
}
