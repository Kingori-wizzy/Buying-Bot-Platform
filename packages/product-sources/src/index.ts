import { CsvFeedAdapter } from './adapters/csv-feed.adapter.js';
import {
  createJumiaSellerApiAdapterFromEnv,
} from './adapters/jumia-seller-api.adapter.js';
import { MockMarketplaceAdapter } from './adapters/mock-marketplace.adapter.js';

export { CsvFeedAdapter } from './adapters/csv-feed.adapter.js';
export {
  createJumiaSellerApiAdapterFromEnv,
  JumiaSellerApiAdapter,
} from './adapters/jumia-seller-api.adapter.js';
export { MockMarketplaceAdapter } from './adapters/mock-marketplace.adapter.js';
export * from './dedupe.js';
export * from './freshness.js';
export * from './http-client.js';
export * from './paginated-port.js';
export * from './quarantine.js';
export * from './source-config.js';
export * from './types.js';
export * from './validate.js';

export type ProductSourceRegistry = Map<string, import('./types.js').ProductSourcePort>;

export function createDefaultProductSourceRegistry(): ProductSourceRegistry {
  const registry: ProductSourceRegistry = new Map();
  const mock = new MockMarketplaceAdapter();
  registry.set(mock.sourceCode, mock);
  registry.set(
    'csv-fixture-feed',
    new CsvFeedAdapter({
      sourceCode: 'csv-fixture-feed',
      sourceName: 'CSV Fixture Feed (Sandbox)',
    }),
  );
  registry.set('jumia-seller-api', createJumiaSellerApiAdapterFromEnv());
  return registry;
}

export { runProductSourceSync } from './ingest/run-sync.js';

export function getProductSource(
  registry: ProductSourceRegistry,
  sourceCode: string,
): import('./types.js').ProductSourcePort | undefined {
  return registry.get(sourceCode);
}
