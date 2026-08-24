'use client';

import { formatMoneyMinor, PlatformApiError } from '@buying-bot/sdk';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface FulfillmentRow {
  readonly id: string;
  readonly status: string;
  readonly deliveryMethod: string;
  readonly deliveryPayload?: Record<string, unknown>;
}

interface OrderView {
  readonly id: string;
  readonly status: string;
  readonly currency?: string;
  readonly financialSnapshot?: {
    readonly payableMinor?: number;
    readonly grandTotalMinor?: number;
    readonly currency?: string;
  } | null;
  readonly items?: readonly unknown[];
  readonly payments?: readonly { readonly status: string }[];
  readonly digitalFulfillments?: readonly FulfillmentRow[];
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAdminSession();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('Access instructions ready for customer');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = (await createBrowserSdk().adminGetOrder(
        params.id,
      )) as OrderView;
      setOrder(next);
      setError(null);
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Order load failed',
      );
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const total =
    order?.financialSnapshot?.payableMinor ??
    order?.financialSnapshot?.grandTotalMinor;
  const currency =
    order?.financialSnapshot?.currency ?? order?.currency ?? 'KES';

  async function markReady(fulfillmentId: string) {
    setBusyId(fulfillmentId);
    try {
      await createBrowserSdk().adminMarkFulfillmentReady(fulfillmentId, {
        note,
      });
      await load();
    } catch (err) {
      setError(
        err instanceof PlatformApiError
          ? err.message
          : 'Could not mark fulfillment ready',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function markDelivered(fulfillmentId: string) {
    setBusyId(fulfillmentId);
    try {
      await createBrowserSdk().adminMarkFulfillmentDelivered(fulfillmentId);
      await load();
    } catch (err) {
      setError(
        err instanceof PlatformApiError
          ? err.message
          : 'Could not mark delivered',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="stack">
      <h1>Order detail</h1>
      {error ? <p className="error">{error}</p> : null}
      {order ? (
        <div className="panel stack">
          <p>
            <strong>Id</strong> {order.id}
          </p>
          <p>
            <strong>Status</strong> {order.status}
          </p>
          <p>
            <strong>Payment</strong> {order.payments?.[0]?.status ?? '—'}
          </p>
          {typeof total === 'number' ? (
            <p className="price">Total {formatMoneyMinor(total, currency)}</p>
          ) : null}
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
            {JSON.stringify(order.items ?? [], null, 2)}
          </pre>

          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Digital fulfillment</h2>
          <p className="muted" style={{ margin: 0 }}>
            Do not paste passwords, API keys, or secret tokens into the note.
          </p>
          <label htmlFor="fulfillment-note">Safe delivery note</label>
          <input
            id="fulfillment-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
            }}
          />
          {(order.digitalFulfillments ?? []).length === 0 ? (
            <p className="muted">No digital fulfillment rows yet.</p>
          ) : (
            (order.digitalFulfillments ?? []).map((f) => (
              <div
                key={f.id}
                className="panel stack"
                style={{ padding: '0.75rem' }}
              >
                <p style={{ margin: 0 }}>
                  <strong>{f.status}</strong> · {f.deliveryMethod}
                </p>
                {can('orders', 'update') ? (
                  <div className="cta-row">
                    {f.status === 'PENDING' ? (
                      <button
                        className="btn"
                        type="button"
                        disabled={busyId === f.id}
                        onClick={() => void markReady(f.id)}
                      >
                        Mark ready
                      </button>
                    ) : null}
                    {f.status === 'READY' ? (
                      <button
                        className="btn"
                        type="button"
                        disabled={busyId === f.id}
                        onClick={() => void markDelivered(f.id)}
                      >
                        Mark delivered
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </section>
  );
}
