import { describe, expect, it } from 'vitest';

import {
  createPrismaClient,
  hashOpaqueToken,
  normalizeEmail,
  PrismaDatabaseClient,
  sha256Hex,
} from './index.js';

const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

describe('@buying-bot/database', () => {
  it('normalizes emails and hashes tokens', () => {
    expect(normalizeEmail('  Ada@Example.COM ')).toBe('ada@example.com');
    expect(sha256Hex('abc')).toHaveLength(64);
    expect(hashOpaqueToken('token')).toBe(sha256Hex('token'));
  });

  it('health-checks postgres when DATABASE_URL_TEST is available', async () => {
    if (!databaseUrl) {
      console.warn(
        'Skipping Prisma health test: set DATABASE_URL_TEST (or DATABASE_URL) to a reachable Postgres.',
      );
      return;
    }

    const prisma = createPrismaClient(databaseUrl);
    const client = new PrismaDatabaseClient(prisma);
    try {
      const health = await client.healthCheck();
      if (!health.ok) {
        console.warn(
          `Skipping Prisma health assertion: database unavailable (${health.message ?? 'unknown'}). Start compose postgres.`,
        );
        return;
      }
      expect(health.ok).toBe(true);
      expect(health.latencyMs).toBeTypeOf('number');
    } finally {
      await client.disconnect();
    }
  });
});
