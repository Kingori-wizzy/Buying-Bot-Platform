import { z } from '@buying-bot/validation';

/** Freshness of source-backed price/availability (not checkout truth). */
export const sourceFreshnessSchema = z.enum([
  'VERIFIED',
  'STALE',
  'UNAVAILABLE',
  'UNKNOWN',
]);
export type SourceFreshness = z.infer<typeof sourceFreshnessSchema>;

export const normalizedSourceProductSchema = z.object({
  sourceProductId: z.string().min(1).max(256),
  sourceOfferId: z.string().min(1).max(256).optional(),
  title: z.string().min(1).max(500),
  brandName: z.string().min(1).max(200).optional(),
  categorySlug: z.string().min(1).max(120).optional(),
  description: z.string().max(20_000).optional(),
  shortDescription: z.string().max(1_000).optional(),
  sourceUrl: z.string().url().max(2_048),
  sellerName: z.string().min(1).max(200),
  gtin: z.string().min(8).max(14).optional(),
  modelNumber: z.string().max(120).optional(),
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3),
  availability: sourceFreshnessSchema,
  imageUrl: z.string().url().max(2_048).optional(),
  imageAttribution: z.string().max(500).optional(),
  specifications: z.record(z.string(), z.string()).optional(),
  variantName: z.string().max(200).default('Default'),
  internalSkuSuffix: z.string().max(80).optional(),
  contentOrigin: z.enum(['REAL_SOURCE', 'SANDBOX', 'TEST', 'DEMO']).default('SANDBOX'),
});

export type NormalizedSourceProduct = z.infer<typeof normalizedSourceProductSchema>;

export interface ProductSourceHealth {
  readonly ok: boolean;
  readonly message: string;
  readonly checkedAt: string;
}

export interface ProductSourceSearchQuery {
  readonly query: string;
  readonly limit?: number;
  readonly maxPriceMinor?: number;
  readonly currency?: string;
  readonly brand?: string;
}

export interface ProductSourceSearchResult {
  readonly items: readonly NormalizedSourceProduct[];
  readonly sourceCode: string;
  readonly fetchedAt: string;
}

export interface ProductSourcePort {
  readonly sourceCode: string;
  readonly sourceName: string;
  readonly sourceType: string;
  health(): Promise<ProductSourceHealth>;
  search(query: ProductSourceSearchQuery): Promise<ProductSourceSearchResult>;
  getProduct(sourceProductId: string): Promise<NormalizedSourceProduct | null>;
}

export interface ProductSourceAdapterConfig {
  readonly sourceCode: string;
  readonly sourceName: string;
  readonly attributionRequired?: boolean;
}
