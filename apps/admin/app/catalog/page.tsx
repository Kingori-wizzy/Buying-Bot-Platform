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

export default function CatalogListPage() {
  const { can } = useAdminSession();
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        // Admin list endpoint is not exposed yet; reuse public ACTIVE list.
        const result = await createBrowserSdk().listProducts({ pageSize: 50 });
        setItems([...result.items]);
      } catch (err) {
        setError(
          err instanceof PlatformApiError
            ? err.message
            : 'Failed to load products',
        );
      }
    })();
  }, []);

  return (
    <section className="stack">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        <h1>Catalog</h1>
        {can('catalog', 'create') ? (
          <Link className="btn" href="/catalog/new">
            Create product
          </Link>
        ) : null}
      </div>
      <p className="muted">
        Listing uses public ACTIVE products until an admin list API exists.
        Creates/updates still call admin catalog endpoints (API-guarded).
      </p>
      {error ? <p className="error">{error}</p> : null}
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Status</th>
            <th>Price (API)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((product) => {
            const price = firstOfferPrice(product);
            return (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.slug}</td>
                <td>{product.status ?? 'ACTIVE'}</td>
                <td>
                  {price
                    ? formatMoneyMinor(price.listPriceMinor, price.currency)
                    : '—'}
                </td>
                <td>
                  {can('catalog', 'update') || can('catalog', 'read') ? (
                    <Link href={`/catalog/${product.id}`}>Edit</Link>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
