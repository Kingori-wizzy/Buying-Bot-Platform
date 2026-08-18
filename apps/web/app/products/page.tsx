import Link from 'next/link';

import { ProductCard } from '@/components/ProductCard';
import { createServerSdk } from '@/lib/api';

export const metadata = {
  title: 'Products',
};

const SORT_OPTIONS = [
  { value: '', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name A–Z' },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;
  const q = params.q?.trim() ?? undefined;
  const sort = params.sort ?? '';
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
      ...(sort ? { sort } : {}),
    });
    items = result.items;
    total = result.total ?? result.items.length;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load products';
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageLink = (p: number) =>
    `/products?page=${String(p)}${q ? `&q=${encodeURIComponent(q)}` : ''}${sort ? `&sort=${encodeURIComponent(sort)}` : ''}`;

  return (
    <main className="page" id="main">
      <section className="stack">
        <div className="section-head">
          <div>
            <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>
              Products
            </h1>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              {error
                ? 'Could not load catalog.'
                : total > 0
                  ? `${String(total)} products — prices resolved on the server.`
                  : 'Live catalog from the API.'}
            </p>
          </div>
          <Link className="btn btn-secondary" href="/assistant">
            Ask AI
          </Link>
        </div>

        <form action="/products" method="get" className="panel">
          <div className="plp-filters">
            <div className="header-search" style={{ flex: '1 1 260px' }}>
              <label className="sr-only" htmlFor="plp-q">
                Search products
              </label>
              <input
                id="plp-q"
                name="q"
                defaultValue={q ?? ''}
                placeholder="Search by name or keyword…"
              />
              <button className="btn" type="submit">
                Search
              </button>
            </div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <label htmlFor="plp-sort" className="sr-only">
                Sort by
              </label>
              <select
                id="plp-sort"
                name="sort"
                defaultValue={sort}
                className="plp-sort-select"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(q ?? sort) ? (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
              {q ? (
                <>
                  Showing results for <strong>&ldquo;{q}&rdquo;</strong>
                  {' · '}
                </>
              ) : null}
              <Link href="/products">Clear filters</Link>
            </p>
          ) : null}
        </form>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        {!error && items.length === 0 ? (
          <div className="empty-state">
            <p>No products match this view.</p>
            <div className="cta-row" style={{ justifyContent: 'center' }}>
              <Link className="btn" href="/products">
                Clear filters
              </Link>
              <Link className="btn btn-secondary" href="/assistant">
                Ask AI assistant
              </Link>
            </div>
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
              <Link className="btn btn-secondary" href={pageLink(page - 1)}>
                Previous
              </Link>
            ) : null}
            <span className="muted">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link className="btn btn-secondary" href={pageLink(page + 1)}>
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
