import {
  computePriceFreshness,
  type PriceFreshnessBand,
  priceFreshnessLabel,
} from '@buying-bot/product-sources';

export interface ProductProvenanceView {
  readonly sourceCode: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly sellerName: string;
  readonly priceMinor: number | null;
  readonly currency: string | null;
  readonly availabilityStatus: string;
  readonly contentOrigin: string;
  readonly priceObservedAt: string | null;
  readonly priceFreshness: PriceFreshnessBand;
  readonly priceFreshnessLabel: string;
  readonly imageUrl: string | null;
  readonly imageAttribution: string | null;
}

export function mapProvenanceRecord(record: {
  source: { code: string; name: string };
  sourceUrl: string;
  sellerName: string;
  priceMinor: number | null;
  currency: string | null;
  availabilityStatus: string;
  contentOrigin: string;
  priceObservedAt: Date | null;
  imageUrl: string | null;
  imageAttribution: string | null;
}): ProductProvenanceView {
  const band = computePriceFreshness(record.priceObservedAt);
  return {
    sourceCode: record.source.code,
    sourceName: record.source.name,
    sourceUrl: record.sourceUrl,
    sellerName: record.sellerName,
    priceMinor: record.priceMinor,
    currency: record.currency,
    availabilityStatus: record.availabilityStatus,
    contentOrigin: record.contentOrigin,
    priceObservedAt: record.priceObservedAt?.toISOString() ?? null,
    priceFreshness: band,
    priceFreshnessLabel: priceFreshnessLabel(band),
    imageUrl: record.imageUrl,
    imageAttribution: record.imageAttribution,
  };
}

export function pickPrimaryImage(product: {
  media?: { mediaAsset?: { externalUrl?: string | null; attribution?: string | null; objectKey?: string | null } | null }[];
  variants?: {
    media?: { mediaAsset?: { externalUrl?: string | null } | null }[];
  }[];
}): { readonly url: string | null; readonly attribution: string | null } {
  const productMedia = product.media?.[0]?.mediaAsset;
  if (productMedia?.externalUrl) {
    return {
      url: productMedia.externalUrl,
      attribution: productMedia.attribution ?? null,
    };
  }
  for (const variant of product.variants ?? []) {
    const asset = variant.media?.[0]?.mediaAsset;
    if (asset?.externalUrl) {
      return { url: asset.externalUrl, attribution: null };
    }
  }
  return { url: null, attribution: null };
}
