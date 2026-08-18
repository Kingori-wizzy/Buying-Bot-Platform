'use client';

import {
  firstOfferPrice,
  formatMoneyMinor,
  PlatformApiError,
  type ProductSummary,
} from '@buying-bot/sdk';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAdminSession } from '@/components/AdminShell';
import { createBrowserSdk } from '@/lib/api';

const PAGE_SIZE = 24;

export default function CatalogListPage() {
  const { can } = useAdminSession();
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        const result = await createBrowserSdk().listProducts({
          pageSize: PAGE_SIZE,
          page,
          ...(search ? { q: search } : {}),
        });
        setItems([...result.items]);
        setTotal(result.total ?? result.items.length);
        setError(null);
      } catch (err) {
        setError(
          err instanceof PlatformApiError
            ? err.message
            : 'Failed to load products',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [page, search]);

  const totalPages = total ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  function handleSearch(e: React.SyntheticEvent) {
    e.preventDefault();
    setSearch(q);
    setPage(1);
  }

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>
            Products
          </h1>
          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
            {total !== null ? `${String(total)} products` : 'Loading…'}
            {' — '}admin catalog
          </p>
        </div>
        {can('catalog', 'create') ? (
          <Link className="btn" href="/catalog/new">
            + Create product
          </Link>
        ) : null}
      </div>

      <form
        onSubmit={handleSearch}
        className="panel"
        style={{ padding: '0.75rem 1rem' }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <label className="sr-only" htmlFor="catalog-q">
            Search catalog
          </label>
          <input
            id="catalog-q"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
            placeholder="Search by name…"
            style={{
              flex: 1,
              font: 'inherit',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--bb-border)',
              borderRadius: '0.4rem',
              background: 'transparent',
              color: 'var(--bb-fg)',
            }}
          />
          <button className="btn" type="submit">
            Search
          </button>
          {search ? (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setQ('');
                setSearch('');
                setPage(1);
              }}
            >
              Clear
            </button>
          ) : null}
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
                animation: 'shimmer 1.2s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      ) : null}

      {!loading && items.length === 0 && !error ? (
        <div className="empty-state">
          <p>No products found{search ? ` for "${search}"` : ''}.</p>
          {can('catalog', 'create') ? (
            <Link className="btn" href="/catalog/new">
              Create first product
            </Link>
          ) : null}
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Price (API)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((product) => {
                const price = firstOfferPrice(product);
                return (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>
                      <code style={{ fontSize: '0.85em' }}>{product.slug}</code>
                    </td>
                    <td>
                      <span className="badge">
                        {product.status ?? 'ACTIVE'}
                      </span>
                    </td>
                    <td>
                      {price
                        ? formatMoneyMinor(price.listPriceMinor, price.currency)
                        : '—'}
                    </td>
                    <td>
                      {can('catalog', 'update') || can('catalog', 'read') ? (
                        <Link href={`/catalog/${product.id}`}>Edit</Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <nav className="cta-row" aria-label="Pagination">
          <button
            className="btn btn-secondary"
            type="button"
            disabled={page <= 1}
            onClick={() => {
              setPage((p) => p - 1);
            }}
          >
            Previous
          </button>
          <span className="muted">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={page >= totalPages}
            onClick={() => {
              setPage((p) => p + 1);
            }}
          >
            Next
          </button>
        </nav>
      ) : null}
    </section>
  );
}
