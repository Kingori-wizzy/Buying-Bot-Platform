import Link from 'next/link';

import { ProductCard } from '@/components/ProductCard';
import { createServerSdk } from '@/lib/api';

const CATEGORY_BLURBS: Record<string, string> = {
  'ai-platforms': 'Explore AI tools and platforms',
  'payout-platforms': 'Explore payout-related digital platforms',
  'academic-writing-accounts': 'Explore academic writing platforms',
  'survey-platforms': 'Explore survey platforms',
  'chat-moderation-platforms': 'Explore chat moderation platforms',
};

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  _count?: { primaryProducts?: number };
}

export default async function HomePage() {
  let featured: Awaited<
    ReturnType<ReturnType<typeof createServerSdk>['listProducts']>
  >['items'] = [];
  let productCount = 0;
  let catalogError = false;
  let rootCategories: CategoryRow[] = [];

  try {
    const sdk = createServerSdk();
    const [list, categories] = await Promise.all([
      sdk.listProducts({ pageSize: 8, productKind: 'DIGITAL' }),
      sdk.listCategories(),
    ]);
    featured = list.items;
    productCount = list.total ?? list.items.length;
    const all = Array.isArray(categories) ? (categories as CategoryRow[]) : [];
    rootCategories = all.filter((c) => !c.parentId);
  } catch {
    catalogError = true;
  }

  return (
    <main className="page bleed" id="main">
      <section className="hero" aria-label="Buying Bot hero">
        <div className="hero-inner">
          <p className="brand-mark">Buying Bot</p>
          <h1>Shop digital products</h1>
          <p className="lede">
            Admin-curated digital accounts, platforms, and access — with
            server-authoritative prices and escrow checkout. The AI assistant
            never invents products or prices.
          </p>
          <div className="cta-row">
            <Link className="btn" href="/assistant">
              Ask the AI assistant
            </Link>
            <Link className="btn btn-ghost" href="/products">
              Browse catalog
            </Link>
          </div>
        </div>
      </section>

      <div className="page-inner">
        <section className="section">
          <div className="section-head">
            <div>
              <h2>Shop by category</h2>
              <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                Five digital product categories. Subcategories and products are
                published by administrators.
              </p>
            </div>
          </div>
          {rootCategories.length === 0 && !catalogError ? (
            <p className="muted">
              Categories will appear after the shop taxonomy is seeded.
            </p>
          ) : null}
          <ul className="card-list" style={{ listStyle: 'none', padding: 0 }}>
            {rootCategories.map((cat) => (
              <li key={cat.id} className="product-card">
                <div className="product-card-body">
                  <h3>
                    <Link href={`/category/${cat.slug}`}>{cat.name}</Link>
                  </h3>
                  <p className="muted" style={{ margin: 0 }}>
                    {CATEGORY_BLURBS[cat.slug] ??
                      cat.description ??
                      'Digital products'}
                  </p>
                  <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    {String(cat._count?.primaryProducts ?? 0)} published
                    product(s)
                  </p>
                </div>
                <div className="product-card-footer">
                  <Link className="btn" href={`/category/${cat.slug}`}>
                    Explore
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="section">
          <form action="/search" method="get" className="panel" role="search">
            <label htmlFor="home-q">
              <strong>Search digital products</strong>
            </label>
            <div className="header-search" style={{ marginTop: '0.65rem' }}>
              <input
                id="home-q"
                name="q"
                placeholder="e.g. AI platform under 2000"
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
              <h2>Published products</h2>
              <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                {catalogError
                  ? 'Catalog temporarily unavailable.'
                  : productCount > 0
                    ? `${String(productCount)} published product(s).`
                    : 'No products published yet — administrators add catalog via Admin.'}
              </p>
            </div>
            <Link href="/products">View all</Link>
          </div>
          {featured.length === 0 && !catalogError ? (
            <div className="empty-state">
              <p>The shop is ready for admin-uploaded digital products.</p>
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
              <strong>Admin-managed catalog</strong>
              <span className="muted">
                Products come from PostgreSQL via administrator publishing — not
                marketplace scrapes.
              </span>
            </div>
            <div className="trust-item">
              <strong>Escrow payments</strong>
              <span className="muted">
                Checkout waits for a signed escrow webhook — never trusts a
                thank-you page alone.
              </span>
            </div>
            <div className="trust-item">
              <strong>AI that uses tools</strong>
              <span className="muted">
                The assistant calls catalog APIs for stock and price. If AI is
                down, commerce still works.
              </span>
            </div>
            <div className="trust-item">
              <strong>Digital fulfillment</strong>
              <span className="muted">
                Sensitive delivery content is only revealed after verified
                payment and authorized fulfillment.
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
