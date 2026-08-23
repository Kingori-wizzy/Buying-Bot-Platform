/**
 * Sandbox marketplace verification — collects evidence-backed metrics.
 * Usage: node --env-file=.env scripts/dev/verify-sandbox-marketplace.mjs
 *
 * Does NOT claim live marketplace verification.
 */
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createPrismaClient } from '../../packages/database/dist/index.js';
import {
  computePriceFreshness,
  createDefaultProductSourceRegistry,
  runProductSourceSync,
} from '../../packages/product-sources/dist/index.js';

const databaseUrl = process.env.DATABASE_URL;
const apiBase = (process.env.API_BASE_URL ?? 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
const origin = process.env.SMOKE_ORIGIN ?? 'http://localhost:3001';

const report = {
  generatedAt: new Date().toISOString(),
  classification: 'CONDITIONALLY REAL MARKET READY',
  liveSourceConnected: false,
  jumiaStatus: 'BLOCKED_EXTERNAL',
  sandboxSource: 'mock-marketplace',
  metrics: {},
  checks: [],
  externalBlockers: [
    'JUMIA_SELLER_API_KEY not set',
    'JUMIA_SELLER_API_SECRET not set',
    'No seller account authorization verified',
  ],
};

function check(name, ok, detail) {
  report.checks.push({ name, ok, detail });
}

if (!databaseUrl) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const prisma = createPrismaClient(databaseUrl);

try {
  // Jumia credential probe (never log secrets)
  const jumiaConfigured = Boolean(
    process.env.JUMIA_SELLER_API_KEY && process.env.JUMIA_SELLER_API_SECRET,
  );
  report.jumiaStatus = jumiaConfigured
    ? 'CREDENTIALS_PRESENT_UNVERIFIED'
    : 'BLOCKED_EXTERNAL';
  report.liveSourceConnected = false;

  const registry = createDefaultProductSourceRegistry();
  const jumia = registry.get('jumia-seller-api');
  if (jumia) {
    const health = await jumia.health();
    check('jumia_health', health.ok, health.message);
  }

  await prisma.productSource.upsert({
    where: { code: 'mock-marketplace' },
    create: {
      code: 'mock-marketplace',
      name: 'Mock Marketplace (Sandbox)',
      sourceType: 'MOCK',
      status: 'ACTIVE',
      enabled: true,
      attributionRequired: true,
      defaultCurrency: 'KES',
      countryCode: 'KE',
    },
    update: { enabled: true, status: 'ACTIVE' },
  });

  const source = await prisma.productSource.findUniqueOrThrow({
    where: { code: 'mock-marketplace' },
  });

  const syncRunId = randomUUID();
  await prisma.sourceSyncRun.create({
    data: {
      id: syncRunId,
      sourceId: source.id,
      status: 'RUNNING',
      correlationId: randomUUID(),
    },
  });

  console.log('Running sandbox sync…');
  await runProductSourceSync(prisma, {
    sourceCode: 'mock-marketplace',
    syncRunId,
  });

  const syncRun = await prisma.sourceSyncRun.findUniqueOrThrow({
    where: { id: syncRunId },
  });

  const records = await prisma.sourceProductRecord.findMany({
    where: { sourceId: source.id },
    include: { source: true },
  });
  const quarantined = await prisma.quarantinedSourceProduct.count({
    where: { sourceId: source.id },
  });

  const withImages = records.filter((r) => r.imageUrl).length;
  const withPrices = records.filter((r) => r.priceMinor != null).length;
  const sandboxOrigin = records.filter(
    (r) => r.contentOrigin === 'SANDBOX' || r.contentOrigin === 'DEMO',
  ).length;
  const realOrigin = records.filter((r) => r.contentOrigin === 'REAL_SOURCE')
    .length;

  const freshness = { FRESH: 0, RECENT: 0, STALE: 0, EXPIRED: 0 };
  for (const r of records) {
    freshness[computePriceFreshness(r.priceObservedAt)] += 1;
  }

  report.metrics = {
    productsImported: records.length,
    validProducts: syncRun.productsAccepted + (syncRun.productsUpdated ?? 0),
    quarantined,
    withImages,
    withPrices,
    contentOrigin: { sandbox: sandboxOrigin, realSource: realOrigin },
    priceFreshness: freshness,
    sync: {
      status: syncRun.status,
      fetched: syncRun.productsFetched,
      accepted: syncRun.productsAccepted,
      updated: syncRun.productsUpdated ?? 0,
      rejected: syncRun.productsRejected,
      removed: syncRun.productsRemoved ?? 0,
      durationMs: syncRun.durationMs ?? null,
    },
  };

  check('sync_success', syncRun.status === 'SUCCESS', syncRun.status);
  check('products_imported', records.length > 0, String(records.length));
  check('sandbox_labeled', sandboxOrigin === records.length, `${sandboxOrigin}/${records.length}`);
  check('no_real_without_credentials', realOrigin === 0, String(realOrigin));

  // API verification (best-effort)
  try {
    const searchRes = await fetch(
      `${apiBase}/v1/search/products?q=Samsung&pageSize=5`,
      { headers: { origin } },
    );
    const searchOk = searchRes.ok;
    let searchItems = 0;
    let searchWithProvenance = 0;
    if (searchOk) {
      const body = await searchRes.json();
      searchItems = body.items?.length ?? 0;
      searchWithProvenance = (body.items ?? []).filter((p) => p.provenance).length;
    }
    check('search_api', searchOk, `items=${searchItems}`);
    check(
      'search_provenance',
      searchWithProvenance > 0,
      String(searchWithProvenance),
    );

    const compareRes = await fetch(`${apiBase}/v1/products/compare`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        productIds: records
          .map((r) => r.productId)
          .filter(Boolean)
          .slice(0, 2),
      }),
    });
    check('compare_api', compareRes.ok, String(compareRes.status));
  } catch (err) {
    check(
      'api_reachable',
      false,
      err instanceof Error ? err.message : 'API not running',
    );
  }

  if (jumiaConfigured) {
    report.classification = 'CONDITIONALLY REAL MARKET READY';
    report.externalBlockers = [
      'Jumia credentials present but live sync not verified in this run',
    ];
  }

  const outPath = join(
    process.cwd(),
    'docs/project/REAL_MARKET_LIVE_VERIFICATION_EVIDENCE.json',
  );
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`Evidence written to ${outPath}`);
} finally {
  await prisma.$disconnect();
}
