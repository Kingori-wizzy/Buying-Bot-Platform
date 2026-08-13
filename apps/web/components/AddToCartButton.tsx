'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useState } from 'react';

import { createBrowserSdk } from '@/lib/api';

export function AddToCartButton({
  offerId,
  quantity = 1,
}: {
  offerId: string;
  quantity?: number;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState(quantity);

  async function onAdd() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await createBrowserSdk().addCartItem({
        offerId,
        quantity: Math.max(1, qty),
      });
      setMessage('Added to cart');
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Could not add to cart',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: '0.5rem' }}>
      <div className="qty-controls">
        <label htmlFor={`qty-${offerId}`} className="sr-only">
          Quantity
        </label>
        <input
          id={`qty-${offerId}`}
          type="number"
          min={1}
          max={99}
          value={qty}
          onChange={(e) => {
            setQty(Number(e.target.value) || 1);
          }}
        />
        <button
          className="btn"
          type="button"
          disabled={busy}
          onClick={() => {
            void onAdd();
          }}
        >
          {busy ? 'Adding…' : 'Add to cart'}
        </button>
      </div>
      {message ? <p className="muted">{message}</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
