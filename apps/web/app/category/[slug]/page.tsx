import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductCard } from '@/components/ProductCard';
import { createServerSdk } from '@/lib/api';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ subcategory?: string }>;
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const { subcategory } = await searchParams;
  const sdk = createServerSdk();

  let category: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    parent?: { name: string; slug: string } | null;
    children?: {
      id: string;
      name: string;
      slug: string;
      _count?: { primaryProducts?: number };
    }[];
    _count?: { primaryProducts?: number };
  };

  try {
    category = (await sdk.getCategory(slug)) as typeof category;
  } catch {
    notFound();
  }

  const filterSlug = subcategory ?? slug;
  const products = await sdk.listProducts({
    categorySlug: filterSlug,
    pageSize: 24,
    productKind: 'DIGITAL',
  });

  return (
    <main className="page" id="main">
      <div className="page-inner">
        <nav
          className="muted"
          style={{ marginBottom: '1rem', fontSize: '0.9rem' }}
        >
          <Link href="/">Home</Link>
          {' / '}
          {category.parent ? (
            <>
              <Link href={`/category/${category.parent.slug}`}>
                {category.parent.name}
              </Link>
              {' / '}
            </>
          ) : null}
          <span>{category.name}</span>
        </nav>

        <header className="section-head">
          <div>
            <h1 style={{ margin: 0 }}>{category.name}</h1>
            <p className="muted" style={{ margin: '0.35rem 0 0' }}>
              {category.description ??
                'Digital products in this category. Prices come from the catalog database.'}
            </p>
          </div>
        </header>

        {category.children && category.children.length > 0 ? (
          <section className="section">
            <h2>Subcategories</h2>
            <ul className="card-list" style={{ listStyle: 'none', padding: 0 }}>
              {category.children.map((child) => (
                <li key={child.id}>
                  <Link
                    className="btn btn-ghost"
                    href={`/category/${child.slug}`}
                  >
                    {child.name} ({String(child._count?.primaryProducts ?? 0)})
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="section">
          <h2>Products</h2>
          {products.items.length === 0 ? (
            <div className="empty-state">
              <p>No published products in this category yet.</p>
              <Link className="btn" href="/">
                Shop by category
              </Link>
            </div>
          ) : (
            <ul className="card-list">
              {products.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
