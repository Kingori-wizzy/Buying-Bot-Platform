'use client';

import { formatMoneyMinor, PlatformApiError } from '@buying-bot/sdk';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getApiBaseUrl } from '@/lib/api';

interface CompareRow {
  productId: string;
  found: boolean;
  name?: string;
  brand?: string | null;
  listPriceMinor?: number | null;
  currency?: string | null;
  imageUrl?: string | null;
  contentOrigin?: string | null;
}

export default function ComparePage() {
  const params = useSearchParams();
  const idsParam = params.get('ids') ?? '';
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ids = idsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length < 2) {
      setError('Add ?ids=uuid1,uuid2 to compare products');
      return;
    }
    void (async () => {
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/v1/products/compare`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productIds: ids }),
        });
        if (!res.ok) {
          throw new PlatformApiError('Compare failed', { status: res.status, code: 'COMPARE_FAILED' });
        }
        setRows((await res.json()) as CompareRow[]);
      } catch (err) {
        setError(err instanceof PlatformApiError ? err.message : 'Compare failed');
      }
    })();
  }, [idsParam]);

  return (
    <main className="page" id="main">
      <section className="stack">
        <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>Compare products</h1>
        <p className="muted" style={{ margin: 0 }}>
          Prices and availability come from Buying Bot&apos;s administrator-managed catalog.
        </p>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="grid-cards">
          {rows.map((row) => (
            <article key={row.productId} className="panel stack">
              {row.imageUrl ? (
                <img src={row.imageUrl} alt="" style={{ width: '100%', borderRadius: 8 }} />
              ) : (
                <div className="thumb">{row.name?.slice(0, 2).toUpperCase() ?? '?'}</div>
              )}
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{row.name ?? row.productId}</h2>
              {row.brand ? <p className="muted" style={{ margin: 0 }}>{row.brand}</p> : null}
              {typeof row.listPriceMinor === 'number' && row.currency ? (
                <p className="price" style={{ margin: 0 }}>
                  {formatMoneyMinor(row.listPriceMinor, row.currency)}
                </p>
              ) : null}
              {row.contentOrigin === 'DEMO' || row.contentOrigin === 'IMPORT' ? (
                <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                  {row.contentOrigin === 'DEMO' ? 'DEMO / STAGING DATA' : 'Imported catalog item'}
                </p>
              ) : null}
              <Link className="btn btn-secondary" href={`/products/${row.productId}`}>
                View details
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
