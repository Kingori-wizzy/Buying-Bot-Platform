import { createHash, randomUUID } from 'node:crypto';

import type { PrismaClient } from '@buying-bot/database';

export interface PaymentInitiatePayload {
  readonly orderId: string;
  readonly paymentId: string;
  readonly attemptId: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly msisdnE164?: string | undefined;
  readonly customerSubjectId?: string | undefined;
  readonly returnUrl?: string | undefined;
}

export interface PaymentWorkerConfig {
  readonly provider: 'escrow' | 'mpesa';
  readonly escrow?: {
    readonly apiKey?: string | undefined;
    readonly apiSecret?: string | undefined;
    readonly baseUrl?: string | undefined;
    readonly webhookSecret?: string | undefined;
    readonly allowTestDouble?: boolean | undefined;
  };
  readonly mpesa?: {
    readonly enabled?: boolean | undefined;
    readonly consumerKey?: string | undefined;
    readonly consumerSecret?: string | undefined;
    readonly shortcode?: string | undefined;
    readonly passkey?: string | undefined;
    readonly callbackUrl?: string | undefined;
    readonly env: 'sandbox' | 'production';
  };
}

function escrowConfigured(config: PaymentWorkerConfig['escrow']): boolean {
  return Boolean(
    config?.apiKey &&
      config.apiSecret &&
      config.baseUrl &&
      config.webhookSecret,
  );
}

/**
 * Process payment.initiate outbox — escrow-first.
 * Without escrow credentials: marks attempt FAILED with ESCROW_NOT_CONFIGURED
 * (unless allowTestDouble for automated tests).
 * Does not invent live settlement.
 */
export async function initiatePaymentFromOutbox(
  prisma: PrismaClient,
  payload: PaymentInitiatePayload,
  config: PaymentWorkerConfig,
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

  if (config.provider === 'escrow') {
    const escrow = config.escrow ?? {};
    if (!escrowConfigured(escrow)) {
      if (escrow.allowTestDouble) {
        const providerReference = `escrow_test_${createHash('sha256')
          .update(`${payload.orderId}:${String(payload.amountMinor)}`)
          .digest('hex')
          .slice(0, 24)}`;
        await prisma.$transaction(async (tx) => {
          await tx.paymentAttempt.update({
            where: { id: payload.attemptId },
            data: {
              status: 'INITIATED',
              providerReference,
              providerCheckoutId: `esc_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
              initiatedAt: new Date(),
            },
          });
          await tx.payment.update({
            where: { id: payload.paymentId },
            data: { status: 'INITIATED' },
          });
        });
        return;
      }
      await prisma.$transaction(async (tx) => {
        await tx.paymentAttempt.update({
          where: { id: payload.attemptId },
          data: {
            status: 'FAILED',
            failureReason: 'ESCROW_NOT_CONFIGURED',
            providerReference: `escrow_unconfigured_${payload.orderId.slice(0, 8)}`,
          },
        });
        await tx.payment.update({
          where: { id: payload.paymentId },
          data: { status: 'FAILED' },
        });
      });
      return;
    }

    // Live escrow HTTP — generic path; align with provider docs when available.
    const baseUrl = escrow.baseUrl;
    const apiKey = escrow.apiKey;
    const apiSecret = escrow.apiSecret;
    if (!baseUrl || !apiKey || !apiSecret) {
      await prisma.$transaction(async (tx) => {
        await tx.paymentAttempt.update({
          where: { id: payload.attemptId },
          data: {
            status: 'FAILED',
            failureReason: 'ESCROW_NOT_CONFIGURED',
            providerReference: `escrow_unconfigured_${payload.orderId.slice(0, 8)}`,
          },
        });
        await tx.payment.update({
          where: { id: payload.paymentId },
          data: { status: 'FAILED' },
        });
      });
      return;
    }
    const base = baseUrl.replace(/\/$/, '');
    const token = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString(
      'base64',
    );
    const response = await fetch(`${base}/v1/payments`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${token}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        amountMinor: payload.amountMinor,
        currency: payload.currency,
        orderId: payload.orderId,
        accountReference: payload.orderId.slice(0, 12),
        description: 'Buying Bot order',
        ...(payload.customerSubjectId
          ? { customerId: payload.customerSubjectId }
          : {}),
        ...(payload.returnUrl ? { returnUrl: payload.returnUrl } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      await prisma.$transaction(async (tx) => {
        await tx.paymentAttempt.update({
          where: { id: payload.attemptId },
          data: {
            status: 'FAILED',
            failureReason: `ESCROW_HTTP_${String(response.status)}`,
          },
        });
        await tx.payment.update({
          where: { id: payload.paymentId },
          data: { status: 'FAILED' },
        });
      });
      return;
    }

    const body = (await response.json()) as {
      id?: string;
      checkoutId?: string;
    };
    await prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.update({
        where: { id: payload.attemptId },
        data: {
          status: 'INITIATED',
          providerReference: body.id ?? `escrow_${randomUUID().replace(/-/g, '')}`,
          providerCheckoutId: body.checkoutId ?? null,
          initiatedAt: new Date(),
        },
      });
      await tx.payment.update({
        where: { id: payload.paymentId },
        data: { status: 'INITIATED' },
      });
    });
    return;
  }

  // Deferred M-Pesa path
  if (config.mpesa?.enabled !== true) {
    await prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.update({
        where: { id: payload.attemptId },
        data: {
          status: 'FAILED',
          failureReason: 'MPESA_DISABLED',
        },
      });
      await tx.payment.update({
        where: { id: payload.paymentId },
        data: { status: 'FAILED' },
      });
    });
  }
}
