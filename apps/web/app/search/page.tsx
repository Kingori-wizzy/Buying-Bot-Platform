import Link from 'next/link';

import { ProductCard } from '@/components/ProductCard';
import { createServerSdk } from '@/lib/api';

export const metadata = {
  title: 'Search',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
  let items: Awaited<
    ReturnType<ReturnType<typeof createServerSdk>['searchProducts']>
  >['items'] = [];
  let error: string | undefined;

  if (query) {
    try {
      const result = await createServerSdk().searchProducts({
        q: query,
        pageSize: 24,
      });
      items = result.items;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Search failed';
    }
  }

  return (
    <main className="page" id="main">
      <section className="stack">
        <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>Search</h1>
        <form action="/search" method="get" className="panel" role="search">
          <div className="header-search">
            <label className="sr-only" htmlFor="search-q">
              Search query
            </label>
            <input
              id="search-q"
              name="q"
              defaultValue={query}
              required
            />
            <button className="btn" type="submit">
              Search
            </button>
          </div>
        </form>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        {!query ? (
          <div className="empty-state">
            <p>Enter a query to search the catalog.</p>
          </div>
        ) : null}

        {query && !error && items.length === 0 ? (
          <div className="empty-state">
            <p>No results for “{query}”.</p>
            <Link className="btn" href="/assistant">
              Ask the AI assistant
            </Link>
          </div>
        ) : null}

        {items.length > 0 ? (
          <>
            <p className="muted">
              {items.length} result{items.length === 1 ? '' : 's'} for “{query}”
            </p>
            <ul className="card-list">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </main>
  );
}
