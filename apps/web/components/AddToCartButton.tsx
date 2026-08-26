'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useState } from 'react';

import { createBrowserSdk } from '@/lib/api';
import { notifyCartChanged } from '@/lib/cart-events';

interface Props {
  offerId: string;
  quantity?: number;
  /** When true, renders a single "Add" button without qty stepper (for card grids) */
  compact?: boolean;
}

export function AddToCartButton({
  offerId,
  quantity = 1,
  compact = false,
}: Props) {
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
      notifyCartChanged();
      setMessage('Added ✓');
      setTimeout(() => {
        setMessage(null);
      }, 2500);
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Could not add to cart',
      );
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <span>
        <button
          className="btn"
          type="button"
          disabled={busy}
          style={{ padding: '0.45rem 0.8rem', fontSize: '0.9rem' }}
          onClick={() => {
            void onAdd();
          }}
          aria-label="Add to cart"
        >
          {busy ? '…' : (message ?? 'Add')}
        </button>
        {error ? (
          <span
            className="error"
            role="alert"
            style={{ fontSize: '0.8rem', marginLeft: '0.4rem' }}
          >
            {error}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <div className="stack" style={{ gap: '0.5rem' }}>
      <div className="qty-controls">
        <label htmlFor={`qty-${offerId}`} className="sr-only">
          Quantity
        </label>
        <button
          className="qty-btn"
          type="button"
          aria-label="Decrease quantity"
          disabled={busy || qty <= 1}
          onClick={() => {
            setQty((q) => Math.max(1, q - 1));
          }}
        >
          −
        </button>
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
          className="qty-btn"
          type="button"
          aria-label="Increase quantity"
          disabled={busy || qty >= 99}
          onClick={() => {
            setQty((q) => Math.min(99, q + 1));
          }}
        >
          +
        </button>
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
      {message ? (
        <p className="muted" style={{ margin: 0, color: 'var(--bb-success)' }}>
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
