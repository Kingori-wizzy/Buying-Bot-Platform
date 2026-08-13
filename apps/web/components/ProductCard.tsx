import {
  firstOfferPrice,
  formatMoneyMinor,
  type ProductSummary,
} from '@buying-bot/sdk';
import Link from 'next/link';

export function ProductCard({ product }: { product: ProductSummary }) {
  const price = firstOfferPrice(product);
  const initial = product.name.slice(0, 1).toUpperCase();

  return (
    <li className="product-card">
      <Link href={`/products/${product.slug}`} className="thumb" aria-hidden>
        {initial}
      </Link>
      <h3>
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
      </h3>
      {product.brand?.name ? (
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          {product.brand.name}
        </p>
      ) : null}
      {product.shortDescription ? (
        <p className="muted" style={{ margin: 0, fontSize: '0.92rem' }}>
          {product.shortDescription}
        </p>
      ) : null}
      <p className="price" style={{ margin: 0 }}>
        {price
          ? formatMoneyMinor(price.listPriceMinor, price.currency)
          : 'Price on request'}
      </p>
      <Link className="btn btn-secondary" href={`/products/${product.slug}`}>
        View product
      </Link>
    </li>
  );
}
