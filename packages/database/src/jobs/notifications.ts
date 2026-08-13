import type { PrismaClient } from '@prisma/client';

export interface NotificationEmail {
  readonly recipient: string;
  readonly subject?: string;
  readonly body: string;
}

export type EmailSender = (
  message: NotificationEmail,
) => Promise<{ readonly provider: string; readonly reference?: string }>;

export async function processNotificationIntents(
  prisma: PrismaClient,
  sendEmail: EmailSender,
  limit = 20,
): Promise<number> {
  const intents = await prisma.notificationIntent.findMany({
    where: {
      status: 'PENDING',
      channel: 'EMAIL',
      availableAt: { lte: new Date() },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let sent = 0;
  for (const intent of intents) {
    const claimed = await prisma.notificationIntent.updateMany({
      where: { id: intent.id, status: 'PENDING' },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) {
      continue;
    }
    try {
      const payload =
        typeof intent.payloadJson === 'object' && intent.payloadJson !== null
          ? (intent.payloadJson as Record<string, unknown>)
          : {};
      const subject =
        typeof payload.subject === 'string' ? payload.subject : undefined;
      const receipt = await sendEmail({
        recipient: intent.recipient,
        body:
          typeof payload.body === 'string'
            ? payload.body
            : JSON.stringify(payload),
        ...(subject ? { subject } : {}),
      });
      await prisma.$transaction([
        prisma.notificationDelivery.create({
          data: {
            intentId: intent.id,
            channel: 'EMAIL',
            status: 'SENT',
            provider: receipt.provider,
            providerRef: receipt.reference ?? null,
            attemptKey: `${intent.id}:${String(intent.attempts + 1)}`,
            sentAt: new Date(),
          },
        }),
        prisma.notificationIntent.update({
          where: { id: intent.id },
          data: { status: 'DELIVERED', lastError: null },
        }),
      ]);
      sent += 1;
    } catch (error: unknown) {
      await prisma.notificationIntent.update({
        where: { id: intent.id },
        data: {
          status: 'FAILED',
          lastError:
            error instanceof Error ? error.message.slice(0, 500) : 'unknown',
        },
      });
    }
  }
  return sent;
}
