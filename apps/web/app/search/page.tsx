import { firstOfferPrice, formatMoneyMinor } from '@buying-bot/sdk';
import Link from 'next/link';

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
    <section className="stack">
      <h1>Search</h1>
      <form method="get" action="/search">
        <div className="field">
          <label htmlFor="q">Query</label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="Search products"
          />
        </div>
        <button className="btn" type="submit">
          Search
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {query && !error ? (
        <ul className="card-list">
          {items.map((product) => {
            const price = firstOfferPrice(product);
            return (
              <li key={product.id} className="product-card">
                <h2>
                  <Link href={`/products/${product.slug}`}>{product.name}</Link>
                </h2>
                <p className="price">
                  {price
                    ? formatMoneyMinor(price.listPriceMinor, price.currency)
                    : '—'}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
      {query && !error && items.length === 0 ? (
        <p className="muted">No results for “{query}”.</p>
      ) : null}
    </section>
  );
}
