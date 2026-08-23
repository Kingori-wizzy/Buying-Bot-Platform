import {
  DEFAULT_HTTP_RETRY_POLICY,
  fetchWithRetry,
  HttpRequestError,
} from '../http-client.js';
import type { PaginatedProductSourcePort } from '../paginated-port.js';
import { parseSourceRuntimeConfig,readJumiaEnvConfig } from '../source-config.js';
import type {
  NormalizedSourceProduct,
  ProductSourceHealth,
  ProductSourcePort,
  ProductSourceSearchQuery,
  ProductSourceSearchResult,
} from '../types.js';
import { isSafePublicHttpUrl } from '../validate.js';

interface JumiaCatalogProduct {
  readonly id?: string;
  readonly seller_sku?: string;
  readonly name?: string;
  readonly brand?: string;
  readonly price?: number;
  readonly currency?: string;
  readonly status?: string;
  readonly url?: string;
  readonly image_url?: string;
  readonly gtin?: string;
}

interface JumiaCatalogResponse {
  readonly data?: readonly JumiaCatalogProduct[];
  readonly pagination?: {
    readonly page?: number;
    readonly total_pages?: number;
    readonly total?: number;
  };
}

/**
 * Jumia Seller Center / GPM API adapter.
 * BLOCKED_EXTERNAL until valid seller credentials are provided and verified.
 * Never fabricates catalog rows.
 */
export class JumiaSellerApiAdapter implements ProductSourcePort, PaginatedProductSourcePort {
  readonly sourceCode = 'jumia-seller-api';
  readonly sourceName = 'Jumia Seller Center API';
  readonly sourceType = 'MARKETPLACE_API';

  constructor(
    private readonly config: ReturnType<typeof readJumiaEnvConfig>,
    private readonly runtime = parseSourceRuntimeConfig({}),
  ) {}

  isConfigured(): boolean {
    return this.config.configured;
  }

  async health(): Promise<ProductSourceHealth> {
    const checkedAt = new Date().toISOString();
    if (!this.config.configured) {
      return {
        ok: false,
        message:
          'BLOCKED_EXTERNAL: set JUMIA_SELLER_API_KEY, JUMIA_SELLER_API_SECRET, JUMIA_SELLER_API_BASE_URL',
        checkedAt,
      };
    }
    if (!isSafePublicHttpUrl(this.config.baseUrl)) {
      return {
        ok: false,
        message: 'BLOCKED_EXTERNAL: base URL failed SSRF validation',
        checkedAt,
      };
    }
    try {
      const response = await fetchWithRetry(
        `${this.config.baseUrl.replace(/\/$/, '')}/catalog/products?page=1&page_size=1`,
        {
          method: 'GET',
          headers: this.authHeaders(),
        },
        {
          ...DEFAULT_HTTP_RETRY_POLICY,
          timeoutMs: this.runtime.timeoutMs,
          maxAttempts: this.runtime.maxAttempts,
        },
      );
      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          message: `BLOCKED_EXTERNAL: authentication failed (HTTP ${String(response.status)})`,
          checkedAt,
        };
      }
      if (!response.ok) {
        return {
          ok: false,
          message: `CONFIGURED but connectivity unverified (HTTP ${String(response.status)})`,
          checkedAt,
        };
      }
      return {
        ok: true,
        message: 'LIVE connectivity verified against Jumia catalog endpoint',
        checkedAt,
      };
    } catch (error) {
      const message =
        error instanceof HttpRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'connectivity check failed';
      return {
        ok: false,
        message: `CONFIGURED but not verified: ${message}`,
        checkedAt,
      };
    }
  }

  async search(
    query: ProductSourceSearchQuery,
  ): Promise<ProductSourceSearchResult> {
    const page = await this.searchPage({
      ...query,
      page: 0,
      limit: query.limit ?? this.runtime.pageSize,
    });
    return {
      items: page.items,
      sourceCode: page.sourceCode,
      fetchedAt: page.fetchedAt,
    };
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
    if (!this.config.configured) {
      throw new Error(
        'BLOCKED_EXTERNAL: Jumia credentials not configured — sync refused',
      );
    }
    const page = query.page ?? (query.cursor ? Number.parseInt(query.cursor, 10) : 0);
    const pageSize = query.limit ?? this.runtime.pageSize;
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/catalog/products?page=${String(page + 1)}&page_size=${String(pageSize)}`;
    const response = await fetchWithRetry(
      url,
      { method: 'GET', headers: this.authHeaders() },
      {
        ...DEFAULT_HTTP_RETRY_POLICY,
        timeoutMs: this.runtime.timeoutMs,
        maxAttempts: this.runtime.maxAttempts,
      },
    );
    if (!response.ok) {
      throw new HttpRequestError(
        `Jumia catalog fetch failed: HTTP ${String(response.status)}`,
        response.status,
        response.status >= 500 || response.status === 429,
      );
    }
    const body = (await response.json()) as JumiaCatalogResponse;
    const items = (body.data ?? [])
      .map((row) => this.mapProduct(row))
      .filter((item): item is NormalizedSourceProduct => item !== null);
    const totalPages = body.pagination?.total_pages ?? 1;
    const hasMore = page + 1 < totalPages;
    return {
      items,
      sourceCode: this.sourceCode,
      fetchedAt: new Date().toISOString(),
      hasMore,
      ...(hasMore ? { nextCursor: String(page + 1) } : {}),
      page,
    };
  }

  async getProduct(
    sourceProductId: string,
  ): Promise<NormalizedSourceProduct | null> {
    if (!this.config.configured) {
      return null;
    }
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/catalog/products/${encodeURIComponent(sourceProductId)}`;
    const response = await fetchWithRetry(
      url,
      { method: 'GET', headers: this.authHeaders() },
      {
        ...DEFAULT_HTTP_RETRY_POLICY,
        timeoutMs: this.runtime.timeoutMs,
      },
    );
    if (!response.ok) {
      return null;
    }
    const row = (await response.json()) as JumiaCatalogProduct;
    return this.mapProduct(row);
  }

  private authHeaders(): Record<string, string> {
    return {
      Accept: 'application/json',
      ...(this.config.apiKey ? { 'X-Api-Key': this.config.apiKey } : {}),
      ...(this.config.apiSecret
        ? { Authorization: `Bearer ${this.config.apiSecret}` }
        : {}),
    };
  }

  private mapProduct(row: JumiaCatalogProduct): NormalizedSourceProduct | null {
    const sourceProductId = row.id ?? row.seller_sku;
    const title = row.name?.trim();
    if (!sourceProductId || !title) {
      return null;
    }
    const priceMajor = row.price;
    if (priceMajor === undefined || priceMajor <= 0) {
      return null;
    }
    const sourceUrl = row.url?.trim();
    if (!sourceUrl || !isSafePublicHttpUrl(sourceUrl)) {
      return null;
    }
    const currency = (row.currency ?? 'KES').toUpperCase();
    const amountMinor = Math.round(priceMajor * 100);
    const availability =
      row.status?.toLowerCase() === 'active' ? 'VERIFIED' : 'UNAVAILABLE';
    return {
      sourceProductId,
      title,
      ...(row.brand ? { brandName: row.brand } : {}),
      sourceUrl,
      sellerName: 'Jumia Seller',
      amountMinor,
      currency,
      availability,
      contentOrigin: 'REAL_SOURCE',
      variantName: 'Default',
      ...(row.gtin ? { gtin: row.gtin } : {}),
      ...(row.image_url && isSafePublicHttpUrl(row.image_url)
        ? {
            imageUrl: row.image_url,
            imageAttribution: 'Image © merchant via Jumia',
          }
        : {}),
    };
  }
}

export function createJumiaSellerApiAdapterFromEnv(): JumiaSellerApiAdapter {
  return new JumiaSellerApiAdapter(readJumiaEnvConfig());
}
