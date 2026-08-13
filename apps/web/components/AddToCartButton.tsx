'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useState } from 'react';

import { createBrowserSdk } from '@/lib/api';

export function AddToCartButton({ offerId }: { offerId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAdd() {
    setBusy(true);
    setMessage(null);
    try {
      await createBrowserSdk().addCartItem({ offerId, quantity: 1 });
      setMessage('Added to cart');
    } catch (err) {
      setMessage(
        err instanceof PlatformApiError ? err.message : 'Could not add to cart',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
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
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
