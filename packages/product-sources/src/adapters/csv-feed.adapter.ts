import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  NormalizedSourceProduct,
  ProductSourceHealth,
  ProductSourcePort,
  ProductSourceSearchQuery,
  ProductSourceSearchResult,
} from '../types.js';
import { validateNormalizedProduct } from '../validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface CsvFeedAdapterOptions {
  readonly sourceCode: string;
  readonly sourceName: string;
  readonly feedPath?: string;
}

/**
 * Merchant CSV/Excel feed adapter skeleton — reads JSON-lines or JSON array fixture.
 * Real merchant feeds require EXTERNAL credentials and signed URLs.
 */
export class CsvFeedAdapter implements ProductSourcePort {
  readonly sourceCode: string;
  readonly sourceName: string;
  readonly sourceType = 'CSV_FEED';
  private readonly feedPath: string;

  constructor(options: CsvFeedAdapterOptions) {
    this.sourceCode = options.sourceCode;
    this.sourceName = options.sourceName;
    this.feedPath =
      options.feedPath ??
      join(__dirname, '..', 'fixtures', 'mock-marketplace-products.json');
  }

  health(): Promise<ProductSourceHealth> {
    try {
      readFileSync(this.feedPath, 'utf8');
      return Promise.resolve({
        ok: true,
        message: 'Feed file readable',
        checkedAt: new Date().toISOString(),
      });
    } catch {
      return Promise.resolve({
        ok: false,
        message: 'Feed file missing or unreadable',
        checkedAt: new Date().toISOString(),
      });
    }
  }

  private loadProducts(): NormalizedSourceProduct[] {
    const raw = readFileSync(this.feedPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) {
      throw new Error('INVALID_FEED_FORMAT');
    }
    return parsed.map((row) => validateNormalizedProduct(row));
  }

  search(query: ProductSourceSearchQuery): Promise<ProductSourceSearchResult> {
    const q = query.query.trim().toLowerCase();
    const items = this.loadProducts().filter((item) => {
      if (query.maxPriceMinor !== undefined && item.amountMinor > query.maxPriceMinor) {
        return false;
      }
      if (!q) return true;
      return item.title.toLowerCase().includes(q);
    });
    return Promise.resolve({
      items: items.slice(0, query.limit ?? 50),
      sourceCode: this.sourceCode,
      fetchedAt: new Date().toISOString(),
    });
  }

  getProduct(sourceProductId: string): Promise<NormalizedSourceProduct | null> {
    return Promise.resolve(
      this.loadProducts().find((p) => p.sourceProductId === sourceProductId) ?? null,
    );
  }
}
