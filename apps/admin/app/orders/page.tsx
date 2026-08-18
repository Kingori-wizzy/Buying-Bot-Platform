'use client';

import { formatMoneyMinor, PlatformApiError } from '@buying-bot/sdk';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface OrderRow {
  readonly id: string;
  readonly status: string;
  readonly currency?: string;
  readonly payableMinor?: number;
  readonly createdAt?: string;
}

export default function AdminOrdersPage() {
  const { can, loading: sessionLoading } = useAdminSession();
  const canRead = can('orders', 'read');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (sessionLoading || !canRead) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const body = (await createBrowserSdk().adminListOrders({
          pageSize: 50,
          ...(statusFilter ? { status: statusFilter } : {}),
        })) as { items?: OrderRow[] } | OrderRow[];
        const items = Array.isArray(body) ? body : (body.items ?? []);
        setOrders(items);
        setError(null);
      } catch (err) {
        setOrders([]);
        setError(
          err instanceof PlatformApiError
            ? err.message
            : 'Failed to load orders',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionLoading, canRead, statusFilter]);

  if (sessionLoading) {
    return <p className="muted">Loading session…</p>;
  }

  if (!canRead) {
    return (
      <section className="stack">
        <h1>Orders</h1>
        <p className="error">You do not have permission to view orders.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>Orders</h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Live data from GET /v1/admin/orders — server-authoritative.
          </p>
        </div>
      </div>

      <form
        className="panel"
        style={{ padding: '0.75rem 1rem' }}
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label className="sr-only" htmlFor="order-status">
            Filter by status
          </label>
          <select
            id="order-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setLoading(true);
            }}
            style={{
              font: 'inherit',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--bb-border)',
              borderRadius: '0.4rem',
              background: 'transparent',
              color: 'var(--bb-fg)',
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
            <option value="PAID">PAID</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="RECONCILIATION_HOLD">RECONCILIATION_HOLD</option>
          </select>
        </div>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <div className="stack">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 44,
                borderRadius: 6,
                background:
                  'color-mix(in srgb, var(--bb-border) 40%, transparent)',
              }}
            />
          ))}
        </div>
      ) : null}

      {!loading && orders.length === 0 && !error ? (
        <div className="empty-state">
          <p>No orders found.</p>
        </div>
      ) : null}

      {!loading && orders.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Total</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <code style={{ fontSize: '0.85em' }}>
                      {order.id.slice(0, 8)}…
                    </code>
                  </td>
                  <td>
                    <span className="badge">{order.status}</span>
                  </td>
                  <td>
                    {typeof order.payableMinor === 'number'
                      ? formatMoneyMinor(
                          order.payableMinor,
                          order.currency ?? 'KES',
                        )
                      : '—'}
                  </td>
                  <td>
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    <Link href={`/orders/${order.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
