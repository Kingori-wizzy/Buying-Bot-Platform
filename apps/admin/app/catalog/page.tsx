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
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      try {
        const result = await createBrowserSdk().adminListProducts({
          pageSize: PAGE_SIZE,
          page,
          ...(search ? { q: search } : {}),
          ...(status ? { status } : {}),
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
  }, [page, search, status]);

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
            {' — '}administrator-managed catalog
          </p>
        </div>
        <div className="cta-row">
          {can('catalog', 'create') ? (
            <Link className="btn btn-secondary" href="/catalog/imports">
              CSV import
            </Link>
          ) : null}
          {can('catalog', 'create') ? (
            <Link className="btn" href="/catalog/new">
              + Create product
            </Link>
          ) : null}
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="panel"
        style={{ padding: '0.75rem 1rem' }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            id="catalog-q"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
            placeholder="Search by name or slug…"
            style={{
              flex: 1,
              minWidth: 180,
              font: 'inherit',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--bb-border)',
              borderRadius: '0.4rem',
              background: 'transparent',
              color: 'var(--bb-fg)',
            }}
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PENDING_REVIEW">PENDING_REVIEW</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <button className="btn" type="submit">
            Search
          </button>
        </div>
      </form>

      {error ? <p className="error">{error}</p> : null}

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
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((product) => {
                const price = firstOfferPrice(product);
                const sku =
                  product.variants?.[0]?.sku &&
                  'internalSku' in (product.variants[0].sku as object)
                    ? (product.variants[0].sku as { internalSku?: string })
                        .internalSku ?? '—'
                    : product.variants?.[0]?.sku?.id.slice(0, 8) ?? '—';
                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {product.slug}
                      </div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.85em' }}>{sku}</code>
                    </td>
                    <td>
                      {(product as { primaryCategory?: { name?: string } })
                        .primaryCategory?.name ?? '—'}
                    </td>
                    <td>
                      {price
                        ? formatMoneyMinor(price.listPriceMinor, price.currency)
                        : '—'}
                    </td>
                    <td>
                      <span className="badge">{product.status ?? 'DRAFT'}</span>
                    </td>
                    <td>
                      <Link href={`/catalog/${product.id}`}>Edit</Link>
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
