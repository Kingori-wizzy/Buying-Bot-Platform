import {
  firstOfferPrice,
  formatMoneyMinor,
  PlatformApiError,
} from '@buying-bot/sdk';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AddToCartButton } from '@/components/AddToCartButton';
import { ProductCard } from '@/components/ProductCard';
import { createServerSdk } from '@/lib/api';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await createServerSdk().getProduct(slug);
    return {
      title: product.name,
      description:
        product.shortDescription ?? `Buy ${product.name} on Buying Bot`,
      openGraph: {
        title: product.name,
        description: product.shortDescription ?? undefined,
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const sdk = createServerSdk();
  let product: Awaited<ReturnType<typeof sdk.getProduct>>;
  try {
    product = await sdk.getProduct(slug);
  } catch (err) {
    if (err instanceof PlatformApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const price = firstOfferPrice(product);
  const offers =
    product.variants?.flatMap((variant) =>
      (variant.sku?.offers ?? []).map((offer) => ({
        offer,
        variantId: variant.id,
        skuId: variant.sku?.id,
      })),
    ) ?? [];

  let related: Awaited<ReturnType<typeof sdk.listProducts>>['items'] = [];
  try {
    const list = await sdk.listProducts({ pageSize: 4 });
    related = list.items.filter((item) => item.id !== product.id).slice(0, 4);
  } catch {
    related = [];
  }

  return (
    <main className="page" id="main">
      <article className="stack">
        <p className="muted" style={{ margin: 0 }}>
          <Link href="/products">Products</Link>
          {' / '}
          <span>{product.name}</span>
        </p>

        <div className="pdp">
          <div className="pdp-gallery">
            {product.primaryImageUrl ? (
              <img
                src={product.primaryImageUrl}
                alt={product.name}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: 'var(--bb-radius)',
                }}
              />
            ) : (
              <span aria-hidden>{product.name}</span>
            )}
          </div>
          <div className="stack">
            {(product as { contentOrigin?: string }).contentOrigin ===
              'DEMO' ||
            (product as { contentOrigin?: string }).contentOrigin ===
              'IMPORT' ? (
              <span className="badge badge-sandbox">
                Demo / staging catalog data
              </span>
            ) : null}
            <h1 style={{ margin: 0, fontFamily: 'var(--bb-display)' }}>
              {product.name}
            </h1>
            {product.brand?.name ? (
              <p className="muted" style={{ margin: 0 }}>
                {product.brand.name}
              </p>
            ) : null}
            {product.shortDescription ? (
              <p className="muted">{product.shortDescription}</p>
            ) : null}
            <p className="price" style={{ fontSize: '1.45rem', margin: 0 }}>
              {price
                ? formatMoneyMinor(price.listPriceMinor, price.currency)
                : 'Not currently purchasable'}
            </p>
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              {price
                ? 'Price from the administrator-managed Offer. Checkout re-resolves totals server-side.'
                : 'This product has no active offer. Add to Cart is unavailable until an administrator publishes a price.'}
            </p>

            {offers.length > 1 ? (
              <div className="panel stack">
                <strong>Available offers</strong>
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {offers.map(({ offer, skuId }) => (
                    <li key={offer.id}>
                      {formatMoneyMinor(offer.listPriceMinor, offer.currency)}
                      {skuId ? (
                        <span className="muted">
                          {' '}
                          · SKU {skuId.slice(0, 8)}…
                        </span>
                      ) : null}
                      {offer.active === false ? (
                        <span className="muted"> · inactive</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {price ? (
              <div className="cta-row">
                <AddToCartButton offerId={price.offerId} />
                <Link className="btn btn-secondary" href="/checkout">
                  Buy now
                </Link>
                <Link className="btn btn-secondary" href="/assistant">
                  Ask AI about this
                </Link>
              </div>
            ) : (
              <p className="muted">
                Not currently purchasable — no active offer or inventory
                listing.
              </p>
            )}
          </div>
        </div>

        {related.length > 0 ? (
          <section className="section">
            <h2>Related products</h2>
            <ul className="card-list">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </main>
  );
}
