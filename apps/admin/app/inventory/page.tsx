'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useCallback, useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `inv-${String(Date.now())}`;
}

export default function InventoryPage() {
  const { can } = useAdminSession();
  const [rows, setRows] = useState<unknown[]>([]);
  const [skuId, setSkuId] = useState('');
  const [quantityDelta, setQuantityDelta] = useState('1');
  const [reason, setReason] = useState('manual adjust');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canRead = can('inventory', 'read');
  const canUpdate = can('inventory', 'update');

  const load = useCallback(async () => {
    if (!canRead) return;
    try {
      const result = (await createBrowserSdk().adminListInventory({
        pageSize: 50,
      })) as { items?: unknown[] } | unknown[];
      setRows(Array.isArray(result) ? result : (result.items ?? []));
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Inventory load failed',
      );
    }
  }, [canRead]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdjust(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!canUpdate) {
      setError('Missing inventory:update');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createBrowserSdk().adminAdjustInventory({
        skuId: skuId.trim(),
        quantityDelta: Number(quantityDelta),
        reason: reason.trim(),
        idempotencyKey: newKey(),
      });
      setMessage('Adjustment accepted by API');
      await load();
    } catch (err) {
      setError(err instanceof PlatformApiError ? err.message : 'Adjust failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <h1>Inventory</h1>
      {!canRead && !canUpdate ? (
        <p className="error">No inventory permissions (UI gate).</p>
      ) : null}

      {canUpdate ? (
        <form
          className="panel"
          onSubmit={(e) => {
            void onAdjust(e);
          }}
        >
          <h2>Adjust</h2>
          <div className="field">
            <label htmlFor="sku">SKU id</label>
            <input
              id="sku"
              value={skuId}
              onChange={(e) => {
                setSkuId(e.target.value);
              }}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="delta">Quantity delta</label>
            <input
              id="delta"
              value={quantityDelta}
              onChange={(e) => {
                setQuantityDelta(e.target.value);
              }}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="reason">Reason</label>
            <input
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
              }}
              required
            />
          </div>
          {error ? <p className="error">{error}</p> : null}
          {message ? <p className="muted">{message}</p> : null}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Submitting…' : 'Adjust'}
          </button>
        </form>
      ) : null}

      {canRead ? (
        <div className="panel stack">
          <h2 style={{ margin: 0 }}>Balances</h2>
          {rows.length === 0 ? (
            <p className="muted">No inventory rows returned.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Location</th>
                    <th>On hand</th>
                    <th>Reserved</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const item = row as {
                      skuId?: string;
                      locationId?: string;
                      onHand?: number;
                      reserved?: number;
                      id?: string;
                    };
                    return (
                      <tr
                        key={
                          item.id ?? `${item.skuId ?? 'row'}-${String(index)}`
                        }
                      >
                        <td>{item.skuId ?? '—'}</td>
                        <td>{item.locationId ?? '—'}</td>
                        <td>{item.onHand ?? '—'}</td>
                        <td>{item.reserved ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
