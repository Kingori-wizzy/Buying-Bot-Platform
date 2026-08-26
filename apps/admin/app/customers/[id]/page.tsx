'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface CustomerDetail {
  id: string;
  email: string;
  status: string;
  emailVerifiedAt?: string | null;
  createdAt: string;
  memberships: Array<{
    organization: { name: string; slug: string };
    roles: string[];
  }>;
  recentOrders: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAdminSession();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = (await createBrowserSdk().adminGetCustomer(
        params.id,
      )) as CustomerDetail;
      setCustomer(next);
      setError(null);
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Failed to load customer',
      );
    }
  }, [params.id]);

  useEffect(() => {
    if (!can('customers', 'read')) return;
    void load();
  }, [can, load]);

  async function setStatus(
    status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'LOCKED',
  ) {
    if (!can('customers', 'update')) return;
    setBusy(true);
    try {
      await createBrowserSdk().adminPatchCustomerStatus(params.id, { status });
      await load();
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Status update failed',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!can('customers', 'read')) {
    return <p className="error">Missing customers:read</p>;
  }

  return (
    <section className="stack">
      <p className="muted" style={{ margin: 0 }}>
        <Link href="/customers">Customers</Link> / detail
      </p>
      {error ? <p className="error">{error}</p> : null}
      {!customer ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : (
        <>
          <div className="section-head">
            <div>
              <h1 style={{ margin: 0 }}>{customer.email}</h1>
              <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                {customer.status} · created{' '}
                {new Date(customer.createdAt).toLocaleString('en-KE')}
              </p>
            </div>
          </div>
          {can('customers', 'update') ? (
            <div className="cta-row">
              <button
                className="btn"
                type="button"
                disabled={busy}
                onClick={() => void setStatus('ACTIVE')}
              >
                Activate
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={busy}
                onClick={() => void setStatus('SUSPENDED')}
              >
                Suspend
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={busy}
                onClick={() => void setStatus('DEACTIVATED')}
              >
                Deactivate
              </button>
            </div>
          ) : null}
          <div className="panel stack">
            <h2 style={{ margin: 0 }}>Memberships</h2>
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {customer.memberships.map((m) => (
                <li key={m.organization.slug}>
                  {m.organization.name}: {m.roles.join(', ') || '—'}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel stack">
            <h2 style={{ margin: 0 }}>Recent orders</h2>
            {customer.recentOrders.length === 0 ? (
              <p className="muted">No orders.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {customer.recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/orders/${order.id}`}>
                      {order.id.slice(0, 8)}…
                    </Link>{' '}
                    {order.status}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
