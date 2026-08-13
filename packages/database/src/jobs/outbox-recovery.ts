import type { PrismaClient } from '@prisma/client';

/**
 * Requeues bounded failed messages for the normal publisher retry path.
 * Messages already at the caller's attempt ceiling remain failed.
 */
export async function requeueFailedOutbox(
  prisma: PrismaClient,
  limit = 100,
  maxAttempts = 10,
): Promise<number> {
  const failed = await prisma.outboxMessage.findMany({
    where: { status: 'FAILED', attempts: { lt: maxAttempts } },
    orderBy: { updatedAt: 'asc' },
    take: limit,
    select: { id: true },
  });
  if (failed.length === 0) {
    return 0;
  }
  const result = await prisma.outboxMessage.updateMany({
    where: {
      id: { in: failed.map((message) => message.id) },
      status: 'FAILED',
      attempts: { lt: maxAttempts },
    },
    data: {
      status: 'PENDING',
      availableAt: new Date(),
      lastError: null,
    },
  });
  return result.count;
}
