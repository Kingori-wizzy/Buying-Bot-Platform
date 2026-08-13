import {
  firstOfferPrice,
  formatMoneyMinor,
  PlatformApiError,
} from '@buying-bot/sdk';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AddToCartButton } from '@/components/AddToCartButton';
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

  return (
    <article className="stack">
      <h1>{product.name}</h1>
      {product.shortDescription ? (
        <p className="muted">{product.shortDescription}</p>
      ) : null}
      <p className="price">
        {price
          ? formatMoneyMinor(price.listPriceMinor, price.currency)
          : 'Price unavailable'}
      </p>
      {price ? (
        <AddToCartButton offerId={price.offerId} />
      ) : (
        <p className="muted">No active offer for this product.</p>
      )}
    </article>
  );
}
