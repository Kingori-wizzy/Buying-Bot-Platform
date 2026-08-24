'use client';

import {
  firstOfferPrice,
  formatMoneyMinor,
  type ProductSummary,
} from '@buying-bot/sdk';
import Link from 'next/link';

import { AddToCartButton } from '@/components/AddToCartButton';

export function ProductCard({ product }: { product: ProductSummary }) {
  const price = firstOfferPrice(product);
  const initial = product.name.slice(0, 2).toUpperCase();
  const imageUrl = product.primaryImageUrl ?? null;
  const isDemo =
    product.contentOrigin === 'DEMO' || product.contentOrigin === 'IMPORT';
  const categoryName = product.primaryCategory?.name;

  return (
    <li className="product-card">
      <Link
        href={`/products/${product.slug}`}
        className="thumb"
        aria-hidden
        tabIndex={-1}
      >
        {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : initial}
      </Link>
      <div className="product-card-body">
        {isDemo ? (
          <span
            className="badge badge-sandbox"
            style={{ marginBottom: '0.35rem' }}
          >
            Demo catalog
          </span>
        ) : null}
        {categoryName ? (
          <p
            className="muted"
            style={{ margin: '0 0 0.25rem', fontSize: '0.8rem' }}
          >
            {categoryName}
            {product.digitalType
              ? ` · ${product.digitalType.replace(/_/g, ' ')}`
              : ''}
          </p>
        ) : null}
        <h3>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        {product.brand?.name ? (
          <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
            {product.brand.name}
          </p>
        ) : null}
        {product.shortDescription ? (
          <p className="muted product-card-desc">{product.shortDescription}</p>
        ) : null}
      </div>
      <div className="product-card-footer">
        <p className="price" style={{ margin: 0 }}>
          {price
            ? formatMoneyMinor(price.listPriceMinor, price.currency)
            : 'Not currently purchasable'}
        </p>
        <div className="product-card-actions">
          {price ? <AddToCartButton offerId={price.offerId} compact /> : null}
          <Link
            className="btn btn-secondary"
            href={`/products/${product.slug}`}
          >
            View product
          </Link>
        </div>
      </div>
    </li>
  );
}
