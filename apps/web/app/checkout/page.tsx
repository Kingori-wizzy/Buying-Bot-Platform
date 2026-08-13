'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSdk } from '@/lib/api';

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `checkout-${String(Date.now())}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [msisdn, setMsisdn] = useState('+2547');
  const [coupon, setCoupon] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = (await createBrowserSdk().checkout(
        {
          msisdnE164: msisdn.trim(),
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

  return (
    <section className="stack">
      <h1>Checkout</h1>
      <p className="muted">
        Creates a PENDING_PAYMENT order via the API. Payment status is only
        trusted from the server.
      </p>
      <form
        onSubmit={(e) => {
          void onSubmit(e);
        }}
      >
        <div className="field">
          <label htmlFor="msisdn">MSISDN (E.164)</label>
          <input
            id="msisdn"
            value={msisdn}
            onChange={(e) => {
              setMsisdn(e.target.value);
            }}
            required
            placeholder="+2547XXXXXXXX"
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
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Placing order…' : 'Place order'}
        </button>
      </form>
    </section>
  );
}
