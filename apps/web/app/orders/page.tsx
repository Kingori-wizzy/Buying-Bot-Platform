'use client';

import { formatMoneyMinor, PlatformApiError } from '@buying-bot/sdk';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { createBrowserSdk } from '@/lib/api';

interface OrderRow {
  readonly id: string;
  readonly status: string;
  readonly currency?: string;
  readonly financialSnapshot?: {
    readonly grandTotalMinor?: number;
    readonly currency?: string;
  } | null;
  readonly createdAt?: string;
}

export default function OrdersIndexPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const body = (await createBrowserSdk().listMyOrders()) as
        { items?: OrderRow[] } | OrderRow[];
      const items = Array.isArray(body) ? body : (body.items ?? []);
      setOrders(items);
      setError(null);
    } catch (err) {
      setOrders(null);
      setError(
        err instanceof PlatformApiError
          ? err.status === 401
            ? 'Sign in to view your orders.'
            : err.message
          : 'Could not load orders',
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="page" id="main">
      <section className="stack">
        <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>
          Your orders
        </h1>
        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
            <div className="cta-row" style={{ marginTop: '0.75rem' }}>
              <Link className="btn" href="/login">
                Log in
              </Link>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => void load()}
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}
        {!orders && !error ? (
          <div className="skeleton" style={{ height: 120 }} />
        ) : null}
        {orders?.length === 0 ? (
          <div className="empty-state">
            <p>No orders yet.</p>
            <Link className="btn" href="/products">
              Start shopping
            </Link>
          </div>
        ) : null}
        {orders && orders.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const total = order.financialSnapshot?.grandTotalMinor;
                  const currency =
                    order.financialSnapshot?.currency ??
                    order.currency ??
                    'KES';
                  return (
                    <tr key={order.id}>
                      <td>{order.id.slice(0, 8)}…</td>
                      <td>{order.status}</td>
                      <td>
                        {typeof total === 'number'
                          ? formatMoneyMinor(total, currency)
                          : '—'}
                      </td>
                      <td>
                        <Link href={`/orders/${order.id}`}>View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}
