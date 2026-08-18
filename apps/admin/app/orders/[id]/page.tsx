'use client';

import { formatMoneyMinor, PlatformApiError } from '@buying-bot/sdk';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { createBrowserSdk } from '@/lib/api';

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
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const next = (await createBrowserSdk().adminGetOrder(
          params.id,
        )) as OrderView;
        setOrder(next);
      } catch (err) {
        setError(
          err instanceof PlatformApiError ? err.message : 'Order load failed',
        );
      }
    })();
  }, [params.id]);

  const total =
    order?.financialSnapshot?.payableMinor ??
    order?.financialSnapshot?.grandTotalMinor;
  const currency =
    order?.financialSnapshot?.currency ?? order?.currency ?? 'KES';

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
        </div>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </section>
  );
}
