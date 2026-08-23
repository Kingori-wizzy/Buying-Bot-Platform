import type {
  NormalizedSourceProduct,
  ProductSourceSearchQuery,
  ProductSourceSearchResult,
} from './types.js';

export interface PaginatedSearchQuery extends ProductSourceSearchQuery {
  readonly cursor?: string;
  readonly page?: number;
}

export interface PaginatedSearchResult extends ProductSourceSearchResult {
  readonly hasMore: boolean;
  readonly nextCursor?: string;
  readonly page?: number;
}

export interface PaginatedProductSourcePort {
  searchPage(query: PaginatedSearchQuery): Promise<PaginatedSearchResult>;
}

export function isPaginatedProductSourcePort(
  adapter: unknown,
): adapter is PaginatedProductSourcePort {
  return (
    typeof adapter === 'object' &&
    adapter !== null &&
    'searchPage' in adapter &&
    typeof (adapter as PaginatedProductSourcePort).searchPage === 'function'
  );
}

export async function fetchAllSourceProducts(
  adapter: {
    search(query: ProductSourceSearchQuery): Promise<ProductSourceSearchResult>;
  } & Partial<PaginatedProductSourcePort>,
  options: { readonly pageSize: number; readonly maxPages?: number },
): Promise<readonly NormalizedSourceProduct[]> {
  const maxPages = options.maxPages ?? 1_000;
  if (isPaginatedProductSourcePort(adapter)) {
    const collected: NormalizedSourceProduct[] = [];
    let cursor: string | undefined;
    let page = 0;
    while (page < maxPages) {
      const result = await adapter.searchPage({
        query: '',
        limit: options.pageSize,
        ...(cursor ? { cursor } : {}),
        page,
      });
      collected.push(...result.items);
      if (!result.hasMore || !result.nextCursor) {
        break;
      }
      cursor = result.nextCursor;
      page += 1;
    }
    return collected;
  }
  const batch = await adapter.search({ query: '', limit: options.pageSize });
  return batch.items;
}
