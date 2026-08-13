'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

interface DashboardMetrics {
  readonly productCount: number | null;
  readonly inventoryRows: number | null;
  readonly apiPing: string | null;
  readonly error: string | null;
}

export default function AdminHomePage() {
  const { me, loading } = useAdminSession();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    productCount: null,
    inventoryRows: null,
    apiPing: null,
    error: null,
  });

  useEffect(() => {
    if (loading || !me) return;
    void (async () => {
      const sdk = createBrowserSdk();
      try {
        const [products, inventory, ping] = await Promise.all([
          sdk.listProducts({ pageSize: 1 }).catch(() => null),
          sdk.adminListInventory({ pageSize: 50 }).catch(() => null),
          sdk.adminPing().catch(() => null),
        ]);
        const inventoryItems = Array.isArray(inventory)
          ? inventory
          : ((inventory as { items?: unknown[] } | null)?.items ?? null);
        setMetrics({
          productCount: products?.total ?? products?.items.length ?? null,
          inventoryRows: inventoryItems ? inventoryItems.length : null,
          apiPing: ping ? 'reachable' : 'unreachable',
          error: null,
        });
      } catch (err) {
        setMetrics({
          productCount: null,
          inventoryRows: null,
          apiPing: null,
          error: err instanceof Error ? err.message : 'Dashboard load failed',
        });
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
            KPIs below are loaded from live APIs. Empty means no data or missing
            permission — nothing is fabricated.
          </p>
        </div>
      </div>

      {metrics.error ? <p className="error">{metrics.error}</p> : null}

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="muted">Catalog products</span>
          <strong>
            {metrics.productCount === null ? '—' : String(metrics.productCount)}
          </strong>
        </div>
        <div className="kpi-card">
          <span className="muted">Inventory rows (sample)</span>
          <strong>
            {metrics.inventoryRows === null
              ? '—'
              : String(metrics.inventoryRows)}
          </strong>
        </div>
        <div className="kpi-card">
          <span className="muted">Admin API ping</span>
          <strong>{metrics.apiPing ?? '—'}</strong>
        </div>
        <div className="kpi-card">
          <span className="muted">MFA</span>
          <strong>{me?.mfaSatisfied ? 'Satisfied' : 'Required'}</strong>
        </div>
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

      <div className="panel stack">
        <h2 style={{ margin: 0 }}>Quick links</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
          <Link className="btn" href="/catalog">
            Products
          </Link>
          <Link className="btn btn-secondary" href="/inventory">
            Inventory
          </Link>
          <Link className="btn btn-secondary" href="/orders">
            Orders
          </Link>
          <Link className="btn btn-secondary" href="/promotions">
            Promotions
          </Link>
        </div>
      </div>
    </section>
  );
}
