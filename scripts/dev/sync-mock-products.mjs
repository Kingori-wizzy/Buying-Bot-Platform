/**
 * Sync mock marketplace fixtures into the internal catalog (requires API DB + worker).
 * Usage: node scripts/dev/sync-mock-products.mjs
 */
import { randomUUID } from 'node:crypto';

import { createPrismaClient, DEFAULT_ORG_SLUG } from '@buying-bot/database';
import { runProductSourceSync } from '@buying-bot/product-sources';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const prisma = createPrismaClient(databaseUrl);

await prisma.productSource.upsert({
  where: { code: 'mock-marketplace' },
  create: {
    code: 'mock-marketplace',
    name: 'Mock Marketplace (Sandbox)',
    sourceType: 'MOCK',
    status: 'ACTIVE',
    attributionRequired: true,
  },
  update: {},
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

console.log('Syncing mock-marketplace fixtures…');
await runProductSourceSync(prisma, {
  sourceCode: 'mock-marketplace',
  syncRunId,
});

const count = await prisma.sourceProductRecord.count({
  where: { sourceId: source.id },
});
const org = await prisma.organization.findUnique({
  where: { slug: DEFAULT_ORG_SLUG },
});
console.log(`Done. Source product records: ${count}. Org: ${org?.slug ?? 'missing'}`);
await prisma.$disconnect();
