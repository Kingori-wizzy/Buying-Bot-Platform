import { createHash, randomUUID } from 'node:crypto';

import type { PrismaClient } from '@buying-bot/database';

export interface PaymentInitiatePayload {
  readonly orderId: string;
  readonly paymentId: string;
  readonly attemptId: string;
  readonly msisdnE164: string;
  readonly amountMinor: number;
  readonly currency: string;
}

export interface MpesaWorkerConfig {
  readonly consumerKey?: string | undefined;
  readonly consumerSecret?: string | undefined;
  readonly shortcode?: string | undefined;
  readonly passkey?: string | undefined;
  readonly callbackUrl?: string | undefined;
  readonly env: 'sandbox' | 'production';
}

function sandboxInitiate(input: {
  msisdnE164: string;
  amountMinor: number;
  accountReference: string;
}): { providerReference: string; providerCheckoutId: string } {
  if (!/^\+[1-9]\d{7,14}$/.test(input.msisdnE164)) {
    throw new Error('INVALID_MSISDN');
  }
  const providerCheckoutId = `ws_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const providerReference = `mpesa_${createHash('sha256')
    .update(
      `${input.accountReference}:${input.msisdnE164}:${String(input.amountMinor)}`,
    )
    .digest('hex')
    .slice(0, 24)}`;
  return { providerReference, providerCheckoutId };
}

/**
 * Process payment.initiate outbox payload — mirrors PaymentsService.initiateFromOutbox.
 * Sandbox simulates STK without network; production requires complete MPESA_* config.
 */
export async function initiatePaymentFromOutbox(
  prisma: PrismaClient,
  payload: PaymentInitiatePayload,
  config: MpesaWorkerConfig,
): Promise<void> {
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: payload.attemptId },
  });
  if (
    !attempt ||
    attempt.status === 'INITIATED' ||
    attempt.status === 'CONFIRMED'
  ) {
    return;
  }

  if (config.env === 'production') {
    if (
      !config.consumerKey ||
      !config.consumerSecret ||
      !config.shortcode ||
      !config.passkey
    ) {
      throw new Error('MPESA_CONFIG_INCOMPLETE');
    }
    // Production Daraja STK Push would run here (outside DB transaction).
  }

  const result = sandboxInitiate({
    msisdnE164: payload.msisdnE164,
    amountMinor: payload.amountMinor,
    accountReference: payload.orderId.slice(0, 12),
  });

  await prisma.$transaction(async (tx) => {
    await tx.paymentAttempt.update({
      where: { id: payload.attemptId },
      data: {
        status: 'INITIATED',
        providerReference: result.providerReference,
        providerCheckoutId: result.providerCheckoutId,
        initiatedAt: new Date(),
      },
    });
    await tx.payment.update({
      where: { id: payload.paymentId },
      data: { status: 'INITIATED' },
    });
  });
}
