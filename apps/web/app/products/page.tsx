import { firstOfferPrice, formatMoneyMinor } from '@buying-bot/sdk';
import Link from 'next/link';

import { createServerSdk } from '@/lib/api';

export const metadata = {
  title: 'Products',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;
  const sdk = createServerSdk();
  let items: Awaited<ReturnType<typeof sdk.listProducts>>['items'] = [];
  let error: string | undefined;
  try {
    const result = await sdk.listProducts({ page, pageSize: 24 });
    items = result.items;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load products';
  }

  return (
    <section>
      <h1>Products</h1>
      {error ? <p className="error">{error}</p> : null}
      {!error && items.length === 0 ? (
        <p className="muted">No products yet. Seed catalog via admin.</p>
      ) : null}
      <ul className="card-list">
        {items.map((product) => {
          const price = firstOfferPrice(product);
          return (
            <li key={product.id} className="product-card">
              <h2>
                <Link href={`/products/${product.slug}`}>{product.name}</Link>
              </h2>
              {product.shortDescription ? (
                <p className="muted">{product.shortDescription}</p>
              ) : null}
              <p className="price">
                {price
                  ? formatMoneyMinor(price.listPriceMinor, price.currency)
                  : 'Price on request'}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
