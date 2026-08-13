/**
 * CLI entry for staging seed. Refuses NODE_ENV=production.
 */
import { createPrismaClient, disconnectPrisma } from './prisma-client.js';
import { seedStagingCatalog } from './seed-staging.js';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing staging seed under NODE_ENV=production');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = createPrismaClient();
  try {
    const result = await seedStagingCatalog(prisma);
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        productId: result.productId,
        skuId: result.skuId,
        offerId: result.offerId,
      })}\n`,
    );
  } finally {
    await disconnectPrisma(prisma);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
