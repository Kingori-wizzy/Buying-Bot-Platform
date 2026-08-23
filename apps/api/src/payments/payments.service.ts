import { createHmac } from 'node:crypto';

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
import { EscrowAdapter } from './escrow.adapter.js';
import { MpesaAdapter } from './mpesa.adapter.js';
import type { PaymentProvider } from './payment-provider.port.js';

@Injectable()
export class PaymentsService {
  private readonly provider: PaymentProvider;
  private readonly escrow: EscrowAdapter;
  private readonly webhookReplayWindowSeconds: number;
  readonly providerName: string;

  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
    @Optional() @Inject(APP_ENV) private readonly env?: ApiEnv,
  ) {
    this.webhookReplayWindowSeconds = env?.WEBHOOK_REPLAY_WINDOW_SECONDS ?? 300;
    const providerName = env?.PAYMENT_PROVIDER ?? 'escrow';
    this.providerName = providerName;

    this.escrow = new EscrowAdapter({
      apiKey: env?.ESCROW_API_KEY,
      apiSecret: env?.ESCROW_API_SECRET,
      baseUrl: env?.ESCROW_BASE_URL,
      webhookSecret: env?.ESCROW_WEBHOOK_SECRET,
      allowTestDouble:
        env?.NODE_ENV === 'test' || env?.ESCROW_ALLOW_TEST_DOUBLE === true,
    });

    if (providerName === 'mpesa') {
      this.provider = new MpesaAdapter({
        consumerKey: env?.MPESA_CONSUMER_KEY,
        consumerSecret: env?.MPESA_CONSUMER_SECRET,
        shortcode: env?.MPESA_SHORTCODE,
        passkey: env?.MPESA_PASSKEY,
        callbackUrl: env?.MPESA_CALLBACK_URL,
        env: env?.MPESA_ENV ?? 'sandbox',
        enabled: env?.MPESA_ENABLED === true,
      });
    } else {
      this.provider = this.escrow;
    }
  }

  getProvider(): PaymentProvider {
    return this.provider;
  }

  isProviderConfigured(): boolean {
    return this.provider.configured;
  }

  async initiateFromOutbox(payload: {
    readonly orderId: string;
    readonly paymentId: string;
    readonly attemptId: string;
    readonly amountMinor: number;
    readonly currency: string;
    readonly msisdnE164?: string | undefined;
    readonly customerSubjectId?: string | undefined;
    readonly returnUrl?: string | undefined;
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
      orderId: payload.orderId,
      accountReference: payload.orderId.slice(0, 12),
      description: 'Buying Bot order',
      ...(payload.msisdnE164 ? { msisdnE164: payload.msisdnE164 } : {}),
      ...(payload.customerSubjectId
        ? { customerSubjectId: payload.customerSubjectId }
        : {}),
      ...(payload.returnUrl ? { returnUrl: payload.returnUrl } : {}),
      ...(this.env?.ESCROW_BASE_URL
        ? {
            callbackUrl: `${this.env.PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3000'}/v1/webhooks/payments/escrow`,
          }
        : {}),
    });

    if (result.status === 'not_configured' || result.status === 'failed') {
      await prisma.$transaction(async (tx) => {
        await tx.paymentAttempt.update({
          where: { id: payload.attemptId },
          data: {
            status: 'FAILED',
            failureReason:
              result.failureReason ?? result.status ?? 'PROVIDER_FAILED',
            providerReference: result.providerReference,
          },
        });
        await tx.payment.update({
          where: { id: payload.paymentId },
          data: { status: 'FAILED' },
        });
      });
      return;
    }

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

  async handleEscrowWebhook(input: {
    readonly rawBody: string;
    readonly signature?: string | undefined;
    readonly timestamp?: string | undefined;
    readonly payload: {
      readonly eventId?: string | undefined;
      readonly id?: string | undefined;
      readonly status?: string | undefined;
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
    const valid = this.escrow.verifyWebhookSignature(
      input.rawBody,
      input.signature,
      input.timestamp,
      this.webhookReplayWindowSeconds,
    );
    if (!valid) {
      throw new UnauthorizedException({
        code: 'INVALID_SIGNATURE',
        message: 'Escrow webhook signature invalid',
      });
    }

    const prisma = this.database.prisma;
    const eventId =
      input.payload.eventId ??
      input.payload.id ??
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
      where: { provider_eventId: { provider: 'escrow', eventId } },
    });
    if (existing) {
      return { ok: true, accepted: true };
    }

    await prisma.webhookReceipt.create({
      data: {
        provider: 'escrow',
        eventId,
        signatureValid: true,
        payloadHash,
        payloadJson: input.payload as never,
      },
    });

    void this.applyEscrowReceipt(eventId, input.payload).catch(() => {
      // Reconcile loop retries
    });

    return { ok: true, accepted: true };
  }

  async applyEscrowReceipt(
    eventId: string,
    payload: {
      readonly orderId?: string | undefined;
      readonly status?: string | undefined;
      readonly providerTxnId?: string | undefined;
      readonly amountMinor?: number | undefined;
      readonly currency?: string | undefined;
      readonly id?: string | undefined;
    },
  ): Promise<void> {
    if (!this.database) {
      return;
    }
    const prisma = this.database.prisma;
    const receipt = await prisma.webhookReceipt.findUnique({
      where: { provider_eventId: { provider: 'escrow', eventId } },
    });
    if (!receipt || receipt.processedAt) {
      return;
    }

    const status = (payload.status ?? '').toLowerCase();
    if (status === 'failed' || status === 'cancelled') {
      await prisma.webhookReceipt.update({
        where: { id: receipt.id },
        data: { processedAt: new Date() },
      });
      return;
    }
    if (
      status !== 'paid' &&
      status !== 'released' &&
      status !== 'confirmed' &&
      status !== 'success'
    ) {
      return;
    }

    let orderId = payload.orderId;
    if (!orderId) {
      const attempt = await prisma.paymentAttempt.findFirst({
        where: {
          OR: [
            { providerReference: payload.id ?? eventId },
            { providerCheckoutId: payload.id ?? eventId },
          ],
        },
        include: { payment: true },
      });
      orderId = attempt?.payment.orderId;
    }
    if (!orderId || payload.amountMinor === undefined) {
      return;
    }

    const payment = await prisma.payment.findFirst({ where: { orderId } });
    if (!payment) {
      return;
    }

    await confirmPaymentForOrder(prisma, {
      orderId,
      providerTxnId: payload.providerTxnId ?? eventId,
      amountMinor: payload.amountMinor,
      currency: payload.currency ?? payment.currency,
      rawPayload: payload,
    });

    await prisma.webhookReceipt.update({
      where: { id: receipt.id },
      data: { processedAt: new Date() },
    });
  }

  /** @deprecated M-Pesa deferred — retained for legacy webhook tests only. */
  verifyMpesaSignature(
    rawBody: string,
    signatureHeader: string | undefined,
    timestampHeader: string | undefined,
  ): boolean {
    const secret = this.env?.MPESA_WEBHOOK_SECRET;
    if (!secret) {
      return (
        this.env?.NODE_ENV !== 'production' && this.env?.NODE_ENV !== 'staging'
      );
    }
    if (!signatureHeader || !timestampHeader) {
      return false;
    }
    // Reuse escrow HMAC shape for legacy tests
    return this.escrow.verifyWebhookSignature(
      rawBody,
      signatureHeader,
      timestampHeader,
      this.webhookReplayWindowSeconds,
    );
  }

  handleMpesaWebhook(_input: {
    readonly rawBody: string;
    readonly signature?: string | undefined;
    readonly timestamp?: string | undefined;
    readonly payload: Record<string, unknown>;
  }): Promise<{ ok: true; accepted: boolean; deferred: true }> {
    // M-Pesa webhooks are no longer applied to customer orders.
    return Promise.resolve({ ok: true, accepted: false, deferred: true });
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
