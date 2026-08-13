'use client';

import { formatMoneyMinor, PlatformApiError } from '@buying-bot/sdk';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createBrowserSdk } from '@/lib/api';

interface OrderView {
  readonly id: string;
  readonly status: string;
  readonly currency?: string;
  readonly financialSnapshot?: {
    readonly grandTotalMinor?: number;
    readonly currency?: string;
  } | null;
  readonly payments?: readonly {
    readonly status: string;
  }[];
}

export default function OrderStatusPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = (await createBrowserSdk().getOrder(orderId)) as OrderView;
      setOrder(next);
      setError(null);
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Order load failed',
      );
    }
  }, [orderId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 4000);
    return () => {
      window.clearInterval(timer);
    };
  }, [load]);

  const totalMinor = order?.financialSnapshot?.grandTotalMinor;
  const currency =
    order?.financialSnapshot?.currency ?? order?.currency ?? 'KES';
  const paymentStatus = order?.payments?.[0]?.status;

  return (
    <section className="stack">
      <h1>Order status</h1>
      <p className="muted">Polling API every 4s. Values are server-authored.</p>
      {error ? <p className="error">{error}</p> : null}
      {order ? (
        <div className="stack">
          <p>
            <strong>Order</strong> {order.id}
          </p>
          <p>
            <strong>Status</strong> {order.status}
          </p>
          {paymentStatus ? (
            <p>
              <strong>Payment</strong> {paymentStatus}
            </p>
          ) : null}
          {typeof totalMinor === 'number' ? (
            <p className="price">
              Total {formatMoneyMinor(totalMinor, currency)}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="muted">Loading…</p>
      )}
    </section>
  );
}
