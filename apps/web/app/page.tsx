import Link from 'next/link';

import { ProductCard } from '@/components/ProductCard';
import { createServerSdk } from '@/lib/api';

export default async function HomePage() {
  let featured: Awaited<
    ReturnType<ReturnType<typeof createServerSdk>['listProducts']>
  >['items'] = [];
  let productCount = 0;
  let catalogError = false;

  try {
    const list = await createServerSdk().listProducts({ pageSize: 8 });
    featured = list.items;
    productCount = list.total ?? list.items.length;
  } catch {
    catalogError = true;
  }

  return (
    <main className="page bleed" id="main">
      <section className="hero" aria-label="Buying Bot hero">
        <div className="hero-inner">
          <p className="brand-mark">Buying Bot</p>
          <h1>Shop smarter with an AI that never invents the price.</h1>
          <p className="lede">
            Browse the catalog, ask the assistant for Kenya-ready
            recommendations, and checkout with M-Pesa — totals stay
            server-authoritative.
          </p>
          <div className="cta-row">
            <Link className="btn" href="/assistant">
              Ask the AI assistant
            </Link>
            <Link className="btn btn-ghost" href="/products">
              Browse products
            </Link>
          </div>
        </div>
      </section>

      <div className="page-inner">
        <section className="section">
          <form action="/search" method="get" className="panel" role="search">
            <label htmlFor="home-q">
              <strong>Search the catalog</strong>
            </label>
            <div className="header-search" style={{ marginTop: '0.65rem' }}>
              <input
                id="home-q"
                name="q"
                placeholder="e.g. laptop 16GB under 100000"
                autoComplete="off"
              />
              <button className="btn" type="submit">
                Search
              </button>
            </div>
          </form>
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <h2>Featured products</h2>
              <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                {catalogError
                  ? 'Catalog temporarily unavailable.'
                  : productCount > 0
                    ? `${String(productCount)} products available from the API.`
                    : 'No products seeded yet.'}
              </p>
            </div>
            <Link href="/products">View all</Link>
          </div>
          {featured.length === 0 && !catalogError ? (
            <div className="empty-state">
              <p>No featured products yet.</p>
              <Link className="btn" href="/products">
                Open catalog
              </Link>
            </div>
          ) : null}
          {featured.length > 0 ? (
            <ul className="card-list">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>
          ) : null}
        </section>

        <section className="section">
          <h2>Shop with confidence</h2>
          <div className="trust-grid">
            <div className="trust-item">
              <strong>Server-authoritative pricing</strong>
              <span className="muted">
                Offer prices resolve on Nest — the browser never decides the
                payable amount.
              </span>
            </div>
            <div className="trust-item">
              <strong>M-Pesa ready</strong>
              <span className="muted">
                Checkout collects your MSISDN and waits for server payment
                confirmation — never trusts a thank-you page alone.
              </span>
            </div>
            <div className="trust-item">
              <strong>AI that uses tools</strong>
              <span className="muted">
                The assistant calls authorized APIs for stock and price. If AI
                is down, commerce still works.
              </span>
            </div>
            <div className="trust-item">
              <strong>Secure sessions</strong>
              <span className="muted">
                HttpOnly cookies, CSRF on mutations, and no payment secrets in
                the frontend.
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
