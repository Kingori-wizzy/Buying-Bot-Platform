'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface CustomerRow {
  id: string;
  email: string;
  status: string;
  orderCount: number;
  roles: string[];
  createdAt: string;
}

export default function CustomersPage() {
  const { can } = useAdminSession();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (query = q) => {
    setBusy(true);
    setError(null);
    try {
      const body = (await createBrowserSdk().adminListCustomers({
        pageSize: 50,
        ...(query.trim() ? { q: query.trim() } : {}),
      })) as { items?: CustomerRow[]; total?: number };
      setItems(body.items ?? []);
      setTotal(body.total ?? 0);
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Failed to load customers',
      );
    } finally {
      setBusy(false);
    }
  }, [q]);

  useEffect(() => {
    if (!can('customers', 'read')) return;
    void load('');
  }, [can, load]);

  if (!can('customers', 'read')) {
    return <p className="error">Missing customers:read</p>;
  }

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>Customers</h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            Identity accounts from PostgreSQL. Credentials are never exposed.
          </p>
        </div>
      </div>

      <form
        className="panel"
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
        onSubmit={(e) => {
          e.preventDefault();
          void load(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
          }}
          placeholder="Search email…"
          style={{ flex: 1, minWidth: 200 }}
        />
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}
      <p className="muted">{total} customer(s)</p>

      {items.length === 0 && !busy ? (
        <div className="empty-state">
          <p>No customers found.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Orders</th>
                <th>Roles</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{row.email}</td>
                  <td>{row.status}</td>
                  <td>{row.orderCount}</td>
                  <td>{row.roles.join(', ') || '—'}</td>
                  <td>
                    <Link href={`/customers/${row.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
