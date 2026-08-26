'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface DashboardData {
  products?: {
    total: number;
    active: number;
    draft: number;
    archived: number;
  };
  inventory?: { outOfStock: number; lowStock: number };
  orders?: {
    pending: number;
    recent: Array<{
      id: string;
      status: string;
      createdAt: string;
      financialSnapshot?: {
        grandTotalMinor?: number;
        currency?: string;
      } | null;
    }>;
  };
  audit?: {
    recent: Array<{
      id: string;
      type: string;
      createdAt: string;
      userId?: string | null;
    }>;
  };
}

export default function AdminHomePage() {
  const { me, loading, can } = useAdminSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !me) return;
    void (async () => {
      try {
        const next = (await createBrowserSdk().adminDashboard()) as DashboardData;
        setData(next);
        setError(null);
      } catch (err) {
        setData(null);
        setError(err instanceof Error ? err.message : 'Dashboard load failed');
      }
    })();
  }, [loading, me]);

  if (loading) {
    return <p className="muted">Loading session…</p>;
  }

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>
            Operations dashboard
          </h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Metrics come from the admin API. Missing permission or empty data
            shows as — — nothing is invented in the browser.
          </p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="muted">Products</span>
          <strong>{data?.products?.total ?? '—'}</strong>
        </div>
        <div className="kpi-card">
          <span className="muted">Active</span>
          <strong>{data?.products?.active ?? '—'}</strong>
        </div>
        <div className="kpi-card">
          <span className="muted">Draft</span>
          <strong>{data?.products?.draft ?? '—'}</strong>
        </div>
        <div className="kpi-card">
          <span className="muted">Archived</span>
          <strong>{data?.products?.archived ?? '—'}</strong>
        </div>
        <div className="kpi-card">
          <span className="muted">Low stock</span>
          <strong>{data?.inventory?.lowStock ?? '—'}</strong>
        </div>
        <div className="kpi-card">
          <span className="muted">Out of stock</span>
          <strong>{data?.inventory?.outOfStock ?? '—'}</strong>
        </div>
        <div className="kpi-card">
          <span className="muted">Open orders</span>
          <strong>{data?.orders?.pending ?? '—'}</strong>
        </div>
        <div className="kpi-card">
          <span className="muted">MFA</span>
          <strong>{me?.mfaSatisfied ? 'Satisfied' : 'Required'}</strong>
        </div>
      </div>

      <div className="panel stack">
        <div className="section-head">
          <h2 style={{ margin: 0 }}>Recent orders</h2>
          {can('orders', 'read') ? (
            <Link className="btn btn-secondary" href="/orders">
              View all
            </Link>
          ) : null}
        </div>
        {data?.orders?.recent?.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.recent.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/orders/${order.id}`}>
                        {order.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td>{order.status}</td>
                    <td>{new Date(order.createdAt).toLocaleString('en-KE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No recent orders.</p>
        )}
      </div>

      <div className="panel stack">
        <div className="section-head">
          <h2 style={{ margin: 0 }}>Recent admin activity</h2>
          {can('audit', 'read') ? (
            <Link className="btn btn-secondary" href="/audit">
              Audit log
            </Link>
          ) : null}
        </div>
        {data?.audit?.recent?.length ? (
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {data.audit.recent.map((event) => (
              <li key={event.id}>
                <strong>{event.type}</strong>{' '}
                <span className="muted">
                  {new Date(event.createdAt).toLocaleString('en-KE')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No recent security events.</p>
        )}
      </div>

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Session</h2>
        {me ? (
          <>
            <p style={{ margin: 0 }}>
              <strong>Subject</strong> {me.subjectId}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Roles</strong> {me.roles.join(', ') || '—'}
            </p>
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              UI hides unauthorized links for convenience. Nest AuthZ remains
              authoritative.
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
