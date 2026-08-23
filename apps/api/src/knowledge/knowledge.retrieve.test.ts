import { apiEnvSchema, loadEnv } from '@buying-bot/config';
import { createPrismaClient, PrismaDatabaseClient } from '@buying-bot/database';
import { afterAll, describe, expect, it } from 'vitest';

import { AiService } from '../ai/ai.service.js';
import { CartService } from '../cart/cart.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { PricingService } from '../pricing/pricing.service.js';
import { KnowledgeService } from './knowledge.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const prisma = databaseUrl ? createPrismaClient(databaseUrl) : undefined;

describeDatabase('knowledge ingest and retrieval', () => {
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('retrieves deterministic embedded content', async () => {
    if (!prisma) {
      return;
    }
    const database = new PrismaDatabaseClient(prisma);
    const env = loadEnv(
      apiEnvSchema,
      {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: databaseUrl,
      },
      'API_TEST',
    );
    const knowledge = new KnowledgeService(database, env);
    const pricing = new PricingService(database, env);
    const catalog = new CatalogService(database, env);
    const carts = new CartService(database, pricing, env);
    const ai = new AiService(database, env, catalog, carts, pricing);
    const marker = `returns-policy-${Date.now().toString(36)}`;

    const created = (await knowledge.ingest({
      title: marker,
      content: `${marker} Customers may return unopened items within 14 days.`,
      sourceType: 'test',
      metadata: {},
    })) as { id: string };

    try {
      await knowledge.processIngestDocument(
        created.id,
        `${marker} Customers may return unopened items within 14 days.`,
      );
      const results = await ai.retrieve({
        query: marker,
        limit: 5,
      });
      expect(
        results.citations.some(
          (result) => result.documentId === created.id,
        ),
      ).toBe(true);
    } finally {
      await prisma.$executeRawUnsafe(
        `DELETE FROM orders.outbox_messages
         WHERE type = 'knowledge.ingest'
           AND payload_json->>'documentId' = $1`,
        created.id,
      );
      await prisma.knowledgeDocument.delete({ where: { id: created.id } });
    }
  });
});
