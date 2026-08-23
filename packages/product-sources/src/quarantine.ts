import type { NormalizedSourceProduct } from './types.js';
import { isSafePublicHttpUrl } from './validate.js';

export type QuarantineReason =
  | 'MISSING_IDENTITY'
  | 'INVALID_PRICE'
  | 'UNSUPPORTED_CURRENCY'
  | 'INVALID_IMAGE_URL'
  | 'INVALID_SOURCE_URL'
  | 'INVALID_GTIN'
  | 'MISSING_PROVENANCE'
  | 'OTHER';

export interface QuarantineDecision {
  readonly ok: true;
}

export interface QuarantineRejection {
  readonly ok: false;
  readonly reason: QuarantineReason;
  readonly detail: string;
}

export type QuarantineResult = QuarantineDecision | QuarantineRejection;

const GTIN_PATTERN = /^\d{8,14}$/;

export function assessQuarantine(
  item: NormalizedSourceProduct,
  options: { readonly allowedCurrencies?: readonly string[] } = {},
): QuarantineResult {
  if (!item.sourceProductId.trim() || !item.title.trim()) {
    return {
      ok: false,
      reason: 'MISSING_IDENTITY',
      detail: 'sourceProductId and title are required',
    };
  }
  if (!item.sellerName.trim()) {
    return {
      ok: false,
      reason: 'MISSING_PROVENANCE',
      detail: 'sellerName is required for provenance',
    };
  }
  if (!item.sourceUrl.trim()) {
    return {
      ok: false,
      reason: 'INVALID_SOURCE_URL',
      detail: 'sourceUrl is required',
    };
  }
  if (!isSafePublicHttpUrl(item.sourceUrl)) {
    return {
      ok: false,
      reason: 'INVALID_SOURCE_URL',
      detail: 'sourceUrl failed SSRF-safe validation',
    };
  }
  if (!Number.isInteger(item.amountMinor) || item.amountMinor <= 0) {
    return {
      ok: false,
      reason: 'INVALID_PRICE',
      detail: 'amountMinor must be a positive integer',
    };
  }
  const allowed = options.allowedCurrencies ?? ['KES', 'USD', 'EUR', 'GBP'];
  if (!allowed.includes(item.currency)) {
    return {
      ok: false,
      reason: 'UNSUPPORTED_CURRENCY',
      detail: `currency ${item.currency} is not supported`,
    };
  }
  if (item.gtin && !GTIN_PATTERN.test(item.gtin)) {
    return {
      ok: false,
      reason: 'INVALID_GTIN',
      detail: `invalid GTIN format: ${item.gtin}`,
    };
  }
  if (item.imageUrl && !isSafePublicHttpUrl(item.imageUrl)) {
    return {
      ok: false,
      reason: 'INVALID_IMAGE_URL',
      detail: 'imageUrl failed SSRF-safe validation',
    };
  }
  return { ok: true };
}
