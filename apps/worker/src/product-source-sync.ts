import type { PrismaClient } from '@buying-bot/database';

export interface ProductSourceSyncPayload {
  readonly sourceCode: string;
  readonly syncRunId: string;
  readonly correlationId?: string;
}

export type ProductSourceSyncHandler = (
  payload: ProductSourceSyncPayload,
) => Promise<void>;

/**
 * Worker entry — delegates to API-equivalent ingestion logic injected at bootstrap.
 */
export async function processProductSourceSync(
  _prisma: PrismaClient,
  payload: ProductSourceSyncPayload,
  handler: ProductSourceSyncHandler,
): Promise<void> {
  await handler(payload);
}
