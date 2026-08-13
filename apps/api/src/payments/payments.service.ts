import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  confirmPaymentForOrder,
  type PrismaDatabaseClient,
} from '@buying-bot/database';
import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';

import type { ApiEnv } from '../config/env.js';
import { APP_ENV, DATABASE_CLIENT } from '../config/tokens.js';
import { MpesaAdapter } from './mpesa.adapter.js';
import type { PaymentProvider } from './payment-provider.port.js';

@Injectable()
export class PaymentsService {
  private readonly provider: PaymentProvider;
  private readonly webhookReplayWindowSeconds: number;

  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
    @Optional() @Inject(APP_ENV) private readonly env?: ApiEnv,
  ) {
    this.webhookReplayWindowSeconds = env?.WEBHOOK_REPLAY_WINDOW_SECONDS ?? 300;
    this.provider = new MpesaAdapter({
      consumerKey: env?.MPESA_CONSUMER_KEY,
      consumerSecret: env?.MPESA_CONSUMER_SECRET,
      shortcode: env?.MPESA_SHORTCODE,
      passkey: env?.MPESA_PASSKEY,
      callbackUrl: env?.MPESA_CALLBACK_URL,
      env: env?.MPESA_ENV ?? 'sandbox',
    });
  }

  getProvider(): PaymentProvider {
    return this.provider;
  }

  async initiateFromOutbox(payload: {
    readonly orderId: string;
    readonly paymentId: string;
    readonly attemptId: string;
    readonly msisdnE164: string;
    readonly amountMinor: number;
    readonly currency: string;
  }): Promise<void> {
    if (!this.database) {
      throw new Error('DATABASE_REQUIRED');
    }
    const prisma = this.database.prisma;
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

    const result = await this.provider.initiate({
      amountMinor: payload.amountMinor,
      currency: payload.currency,
      msisdnE164: payload.msisdnE164,
      accountReference: payload.orderId.slice(0, 12),
      description: 'Buying Bot order',
      ...(this.env?.MPESA_CALLBACK_URL !== undefined
        ? { callbackUrl: this.env.MPESA_CALLBACK_URL }
        : {}),
    });

    await prisma.$transaction(async (tx) => {
      await tx.paymentAttempt.update({
        where: { id: payload.attemptId },
        data: {
          status: 'INITIATED',
          providerReference: result.providerReference,
          providerCheckoutId: result.providerCheckoutId ?? null,
          initiatedAt: new Date(),
        },
      });
      await tx.payment.update({
        where: { id: payload.paymentId },
        data: { status: 'INITIATED' },
      });
    });
  }

  verifyMpesaSignature(
    rawBody: string,
    signatureHeader: string | undefined,
    timestampHeader: string | undefined,
  ): boolean {
    const secret = this.env?.MPESA_WEBHOOK_SECRET;
    if (!secret) {
      // Sandbox without secret: accept only in non-production
      return (
        this.env?.NODE_ENV !== 'production' && this.env?.NODE_ENV !== 'staging'
      );
    }
    if (!signatureHeader || !timestampHeader) {
      return false;
    }
    const ts = Number(timestampHeader);
    if (!Number.isFinite(ts)) {
      return false;
    }
    const windowSec = this.webhookReplayWindowSeconds;
    if (Math.abs(Date.now() / 1000 - ts) > windowSec) {
      return false;
    }
    const expected = createHmac('sha256', secret)
      .update(`${timestampHeader}.${rawBody}`)
      .digest('hex');
    const provided = signatureHeader.replace(/^sha256=/i, '');
    try {
      return timingSafeEqual(
        Buffer.from(expected, 'utf8'),
        Buffer.from(provided, 'utf8'),
      );
    } catch {
      return false;
    }
  }

  async handleMpesaWebhook(input: {
    readonly rawBody: string;
    readonly signature?: string | undefined;
    readonly timestamp?: string | undefined;
    readonly payload: {
      readonly eventId?: string | undefined;
      readonly Body?:
        | {
            readonly stkCallback?: {
              readonly CheckoutRequestID?: string | undefined;
              readonly MerchantRequestID?: string | undefined;
              readonly ResultCode?: number | undefined;
              readonly CallbackMetadata?:
                | {
                    readonly Item?:
                      { Name: string; Value: string | number }[] | undefined;
                  }
                | undefined;
            };
          }
        | undefined;
      readonly orderId?: string | undefined;
      readonly providerTxnId?: string | undefined;
      readonly amountMinor?: number | undefined;
      readonly currency?: string | undefined;
    };
  }): Promise<{ ok: true; accepted: boolean }> {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'Database is not configured',
      });
    }
    const prisma = this.database.prisma;
    const valid = this.verifyMpesaSignature(
      input.rawBody,
      input.signature,
      input.timestamp,
    );
    if (!valid) {
      throw new UnauthorizedException({
        code: 'INVALID_SIGNATURE',
        message: 'Webhook signature invalid',
      });
    }

    const callback = input.payload.Body?.stkCallback;
    const eventId =
      input.payload.eventId ??
      callback?.CheckoutRequestID ??
      callback?.MerchantRequestID ??
      input.payload.providerTxnId;
    if (!eventId) {
      throw new BadRequestException({
        code: 'EVENT_ID_REQUIRED',
        message: 'Webhook event id missing',
      });
    }

    const payloadHash = createHmac('sha256', 'receipt')
      .update(input.rawBody)
      .digest('hex');

    const existing = await prisma.webhookReceipt.findUnique({
      where: { provider_eventId: { provider: 'mpesa', eventId } },
    });
    if (existing) {
      return { ok: true, accepted: true };
    }

    await prisma.webhookReceipt.create({
      data: {
        provider: 'mpesa',
        eventId,
        signatureValid: true,
        payloadHash,
        payloadJson: input.payload as never,
      },
    });

    // Async apply (fire-and-forget); idempotent confirm
    void this.applyMpesaReceipt(eventId, input.payload).catch(() => {
      // Worker reconcile will retry
    });

    return { ok: true, accepted: true };
  }

  async applyMpesaReceipt(
    eventId: string,
    payload: {
      readonly orderId?: string | undefined;
      readonly providerTxnId?: string | undefined;
      readonly amountMinor?: number | undefined;
      readonly currency?: string | undefined;
      readonly Body?:
        | {
            readonly stkCallback?: {
              readonly CheckoutRequestID?: string | undefined;
              readonly MerchantRequestID?: string | undefined;
              readonly ResultCode?: number | undefined;
              readonly CallbackMetadata?:
                | {
                    readonly Item?:
                      { Name: string; Value: string | number }[] | undefined;
                  }
                | undefined;
            };
          }
        | undefined;
    },
  ): Promise<void> {
    if (!this.database) {
      return;
    }
    const prisma = this.database.prisma;
    const receipt = await prisma.webhookReceipt.findUnique({
      where: { provider_eventId: { provider: 'mpesa', eventId } },
    });
    if (!receipt || receipt.processedAt) {
      return;
    }

    const callback = payload.Body?.stkCallback;
    if (callback?.ResultCode !== undefined && callback.ResultCode !== 0) {
      await prisma.webhookReceipt.update({
        where: { id: receipt.id },
        data: { processedAt: new Date() },
      });
      return;
    }

    const items = callback?.CallbackMetadata?.Item ?? [];
    const amountItem = items.find((i) => i.Name === 'Amount');
    const receiptItem = items.find((i) => i.Name === 'MpesaReceiptNumber');
    const amountMinor =
      payload.amountMinor ??
      (typeof amountItem?.Value === 'number'
        ? Math.round(amountItem.Value * 100)
        : undefined);
    const providerTxnId =
      payload.providerTxnId ??
      (typeof receiptItem?.Value === 'string' ? receiptItem.Value : eventId);

    let orderId = payload.orderId;
    if (!orderId) {
      const checkoutId = callback?.CheckoutRequestID;
      const merchantId = callback?.MerchantRequestID;
      const attempt = await prisma.paymentAttempt.findFirst({
        where: {
          OR: [
            ...(checkoutId ? [{ providerCheckoutId: checkoutId }] : []),
            ...(merchantId ? [{ providerReference: merchantId }] : []),
          ],
        },
        include: { payment: true },
      });
      orderId = attempt?.payment.orderId;
    }

    if (!orderId || amountMinor === undefined) {
      return;
    }

    const payment = await prisma.payment.findFirst({
      where: { orderId },
    });
    if (!payment) {
      return;
    }

    await confirmPaymentForOrder(prisma, {
      orderId,
      providerTxnId,
      amountMinor,
      currency: payload.currency ?? payment.currency,
      rawPayload: payload,
    });

    await prisma.webhookReceipt.update({
      where: { id: receipt.id },
      data: { processedAt: new Date() },
    });
  }

  async reconcilePendingPayments(): Promise<number> {
    if (!this.database) {
      return 0;
    }
    const prisma = this.database.prisma;
    const pending = await prisma.paymentAttempt.findMany({
      where: { status: 'INITIATED' },
      take: 20,
      include: { payment: true },
    });
    let count = 0;
    for (const attempt of pending) {
      if (!attempt.providerReference) {
        continue;
      }
      const query = await this.provider.query(attempt.providerReference);
      if (query.status === 'confirmed' && query.providerTxnId) {
        await confirmPaymentForOrder(prisma, {
          orderId: attempt.payment.orderId,
          providerTxnId: query.providerTxnId,
          amountMinor: query.amountMinor ?? attempt.payment.amountMinor,
          currency: query.currency ?? attempt.payment.currency,
          rawPayload: query.raw,
        });
        count += 1;
      }
    }
    return count;
  }
}
