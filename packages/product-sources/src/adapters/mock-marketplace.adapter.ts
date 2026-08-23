import { existsSync, readFileSync } from 'node:fs';
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

function loadFixtures(): readonly NormalizedSourceProduct[] {
  const candidates = [
    join(__dirname, '..', 'fixtures', 'mock-marketplace-products.json'),
    join(__dirname, '..', '..', 'src', 'fixtures', 'mock-marketplace-products.json'),
  ];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) {
    throw new Error('MOCK_MARKETPLACE_FIXTURES_NOT_FOUND');
  }
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as unknown[];
  return parsed.map((item) => validateNormalizedProduct(item));
}

const FIXTURES = loadFixtures();

/**
 * Deterministic sandbox marketplace — NOT a live external integration.
 * Uses licensed fixture URLs on example.com for SSRF-safe testing.
 */
export class MockMarketplaceAdapter implements ProductSourcePort {
  readonly sourceCode = 'mock-marketplace';
  readonly sourceName = 'Mock Marketplace (Sandbox)';
  readonly sourceType = 'MOCK';

  health(): Promise<ProductSourceHealth> {
    return Promise.resolve({
      ok: true,
      message: 'Sandbox fixture catalog available',
      checkedAt: new Date().toISOString(),
    });
  }

  search(query: ProductSourceSearchQuery): Promise<ProductSourceSearchResult> {
    const q = query.query.trim().toLowerCase();
    const limit = query.limit ?? 20;
    const maxPrice = query.maxPriceMinor;
    const brand = query.brand?.trim().toLowerCase();

    let items = FIXTURES.filter((item) => {
      if (brand && item.brandName?.toLowerCase() !== brand) {
        return false;
      }
      if (maxPrice !== undefined && item.amountMinor > maxPrice) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = [
        item.title,
        item.brandName,
        item.shortDescription,
        item.description,
        Object.values(item.specifications ?? {}).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q) || q.split(/\s+/).every((term) => haystack.includes(term));
    });

    items = rankSearchResults(items, q);
    return Promise.resolve({
      items: items.slice(0, limit),
      sourceCode: this.sourceCode,
      fetchedAt: new Date().toISOString(),
    });
  }

  async searchPage(
    query: ProductSourceSearchQuery & { readonly cursor?: string; readonly page?: number },
  ): Promise<
    ProductSourceSearchResult & {
      readonly hasMore: boolean;
      readonly nextCursor?: string;
      readonly page?: number;
    }
  > {
    const full = await this.search({ ...query, limit: 10_000 });
    const offset = query.cursor
      ? Number.parseInt(query.cursor, 10)
      : (query.page ?? 0) * (query.limit ?? 20);
    const pageSize = query.limit ?? 20;
    const slice = full.items.slice(offset, offset + pageSize);
    const hasMore = offset + pageSize < full.items.length;
    return {
      items: slice,
      sourceCode: this.sourceCode,
      fetchedAt: new Date().toISOString(),
      hasMore,
      ...(hasMore ? { nextCursor: String(offset + pageSize) } : {}),
      page: query.page ?? Math.floor(offset / pageSize),
    };
  }

  getProduct(sourceProductId: string): Promise<NormalizedSourceProduct | null> {
    return Promise.resolve(
      FIXTURES.find((p) => p.sourceProductId === sourceProductId) ?? null,
    );
  }
}

function rankSearchResults(
  items: readonly NormalizedSourceProduct[],
  query: string,
): NormalizedSourceProduct[] {
  if (!query) {
    return [...items];
  }
  return [...items].sort((a, b) => score(b, query) - score(a, query));
}

function score(item: NormalizedSourceProduct, query: string): number {
  const title = item.title.toLowerCase();
  let s = 0;
  if (title.includes(query)) s += 10;
  for (const term of query.split(/\s+/)) {
    if (term && title.includes(term)) s += 2;
    if (term && item.brandName?.toLowerCase().includes(term)) s += 3;
  }
  if (item.availability === 'VERIFIED') s += 1;
  return s;
}
