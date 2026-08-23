/**
 * Deterministic deduplication key — prefer GTIN, else brand+model, else source id.
 * Does not merge on fuzzy title similarity alone.
 */
export function buildDedupeKey(product: {
  readonly gtin?: string | undefined;
  readonly brandName?: string | undefined;
  readonly modelNumber?: string | undefined;
  readonly sourceProductId: string;
}): string {
  if (product.gtin) {
    return `gtin:${product.gtin}`;
  }
  const brand = product.brandName?.trim().toLowerCase().replace(/\s+/g, '-');
  const model = product.modelNumber?.trim().toLowerCase().replace(/\s+/g, '-');
  if (brand && model) {
    return `brand-model:${brand}:${model}`;
  }
  return `source-id:${product.sourceProductId}`;
}

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base.length > 0 ? base : 'product';
}
