import Link from 'next/link';

import { ProductCard } from '@/components/ProductCard';
import { createServerSdk } from '@/lib/api';

export const metadata = {
  title: 'Products',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;
  const q = params.q?.trim() ?? undefined;
  const pageSize = 24;
  const sdk = createServerSdk();
  let items: Awaited<ReturnType<typeof sdk.listProducts>>['items'] = [];
  let total = 0;
  let error: string | undefined;

  try {
    const result = await sdk.listProducts({
      page,
      pageSize,
      ...(q ? { q } : {}),
    });
    items = result.items;
    total = result.total ?? result.items.length;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load products';
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="page" id="main">
      <section className="stack">
        <div className="section-head">
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>
              Products
            </h1>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              Live catalog from the API. Prices are offer-resolved on the
              server.
            </p>
          </div>
          <Link className="btn btn-secondary" href="/assistant">
            Ask AI
          </Link>
        </div>

        <form action="/products" method="get" className="panel">
          <div className="header-search">
            <label className="sr-only" htmlFor="plp-q">
              Filter products
            </label>
            <input
              id="plp-q"
              name="q"
              defaultValue={q ?? ''}
              placeholder="Filter by name…"
            />
            <button className="btn" type="submit">
              Apply
            </button>
          </div>
        </form>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        {!error && items.length === 0 ? (
          <div className="empty-state">
            <p>No products match this view.</p>
            <Link className="btn" href="/products">
              Clear filters
            </Link>
          </div>
        ) : null}

        {items.length > 0 ? (
          <ul className="card-list">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
        ) : null}

        {totalPages > 1 ? (
          <nav className="pager" aria-label="Pagination">
            {page > 1 ? (
              <Link
                className="btn btn-secondary"
                href={`/products?page=${String(page - 1)}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              >
                Previous
              </Link>
            ) : null}
            <span className="muted">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                className="btn btn-secondary"
                href={`/products?page=${String(page + 1)}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
              >
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
