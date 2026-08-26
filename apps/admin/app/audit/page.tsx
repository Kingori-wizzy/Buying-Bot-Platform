'use client';

import { PlatformApiError } from '@buying-bot/sdk';
import { useCallback, useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface AuditRow {
  id: string;
  type: string;
  userId?: string | null;
  userEmail?: string | null;
  ip?: string | null;
  createdAt: string;
}

export default function AuditPage() {
  const { can } = useAdminSession();
  const [items, setItems] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const body = (await createBrowserSdk().adminListAuditEvents({
        pageSize: 50,
        ...(type.trim() ? { type: type.trim() } : {}),
      })) as { items?: AuditRow[]; total?: number };
      setItems(body.items ?? []);
      setTotal(body.total ?? 0);
      setError(null);
    } catch (err) {
      setError(
        err instanceof PlatformApiError ? err.message : 'Failed to load audit',
      );
    }
  }, [type]);

  useEffect(() => {
    if (!can('audit', 'read')) return;
    void load();
  }, [can, load]);

  if (!can('audit', 'read')) {
    return <p className="error">Missing audit:read</p>;
  }

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>Audit log</h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            SecurityEvent trail from the identity/audit schema.
          </p>
        </div>
      </div>

      <form
        className="panel"
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          value={type}
          onChange={(e) => {
            setType(e.target.value);
          }}
          placeholder="Filter by event type…"
          style={{ flex: 1, minWidth: 200 }}
        />
        <button className="btn" type="submit">
          Filter
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}
      <p className="muted">{total} event(s)</p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>User</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString('en-KE')}</td>
                <td>{row.type}</td>
                <td>{row.userEmail ?? row.userId ?? '—'}</td>
                <td>{row.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
