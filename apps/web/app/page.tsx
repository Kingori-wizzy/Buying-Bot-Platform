import Link from 'next/link';

import { createServerSdk } from '@/lib/api';

export default async function HomePage() {
  let productCount = 0;
  try {
    const list = await createServerSdk().listProducts({ pageSize: 1 });
    productCount = list.total ?? list.items.length;
  } catch {
    productCount = 0;
  }

  return (
    <section className="stack">
      <h1>Buying Bot</h1>
      <p className="muted">
        Browse catalog, cart, and checkout against the Nest API. Prices and
        payment status always come from the server.
      </p>
      <p>
        Catalog currently reports{' '}
        <strong>{productCount > 0 ? `${String(productCount)}+` : 'no'}</strong>{' '}
        products.
      </p>
      <p>
        <Link className="btn" href="/products">
          Shop products
        </Link>
      </p>
    </section>
  );
}
