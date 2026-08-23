import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import {
  type InitiatePaymentInput,
  type InitiatePaymentResult,
  type PaymentProvider,
  PaymentProviderNotConfiguredError,
  type QueryPaymentResult,
} from './payment-provider.port.js';

export interface EscrowAdapterConfig {
  readonly apiKey?: string | undefined;
  readonly apiSecret?: string | undefined;
  readonly baseUrl?: string | undefined;
  readonly webhookSecret?: string | undefined;
  /** When true, allow a local test double that never claims live money movement. */
  readonly allowTestDouble?: boolean | undefined;
}

/**
 * Escrow payment provider adapter.
 *
 * Without ESCROW_* credentials:
 * - configured = false
 * - initiate returns NOT_CONFIGURED (does not invent success)
 *
 * With credentials:
 * - performs HTTPS calls against ESCROW_BASE_URL (generic REST shape;
 *   exact paths must be aligned when provider docs arrive)
 *
 * Test double (NODE_ENV=test or ESCROW_ALLOW_TEST_DOUBLE=true with no live keys):
 * - creates deterministic pending references for automated tests only
 * - never reports live settlement
 */
export class EscrowAdapter implements PaymentProvider {
  readonly name = 'escrow';
  readonly configured: boolean;
  private readonly allowTestDouble: boolean;

  constructor(private readonly config: EscrowAdapterConfig) {
    this.configured = Boolean(
      config.apiKey &&
        config.apiSecret &&
        config.baseUrl &&
        config.webhookSecret,
    );
    this.allowTestDouble = config.allowTestDouble === true;
  }

  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (!this.configured) {
      if (this.allowTestDouble) {
        const providerReference = `escrow_test_${createHash('sha256')
          .update(`${input.orderId}:${String(input.amountMinor)}`)
          .digest('hex')
          .slice(0, 24)}`;
        return Promise.resolve({
          providerReference,
          providerCheckoutId: `esc_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
          status: 'pending',
          raw: {
            mode: 'test_double',
            warning:
              'TEST DOUBLE ONLY — not a live escrow payment. Credentials NOT_CONFIGURED.',
          },
        });
      }
      return Promise.resolve({
        providerReference: `escrow_unconfigured_${input.orderId.slice(0, 8)}`,
        status: 'not_configured',
        failureReason: 'ESCROW_NOT_CONFIGURED',
        raw: {
          code: 'ESCROW_NOT_CONFIGURED',
          message:
            'Set ESCROW_API_KEY, ESCROW_API_SECRET, ESCROW_BASE_URL, ESCROW_WEBHOOK_SECRET',
        },
      });
    }

    return this.initiateLive(input);
  }

  async query(providerReference: string): Promise<QueryPaymentResult> {
    if (!this.configured || !this.config.baseUrl) {
      return { status: 'not_configured', raw: { providerReference } };
    }
    const base = this.config.baseUrl.replace(/\/$/, '');
    const url = `${base}/v1/payments/${encodeURIComponent(providerReference)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.authHeaders(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return {
        status: 'pending',
        raw: { httpStatus: response.status, providerReference },
      };
    }
    const body = (await response.json()) as {
      status?: string;
      providerTxnId?: string;
      amountMinor?: number;
      currency?: string;
    };
    const mapped =
      body.status === 'paid' ||
      body.status === 'released' ||
      body.status === 'confirmed'
        ? 'confirmed'
        : body.status === 'failed' || body.status === 'cancelled'
          ? 'failed'
          : 'pending';
    return {
      status: mapped,
      ...(body.providerTxnId ? { providerTxnId: body.providerTxnId } : {}),
      ...(body.amountMinor !== undefined
        ? { amountMinor: body.amountMinor }
        : {}),
      ...(body.currency ? { currency: body.currency } : {}),
      raw: body,
    };
  }

  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | undefined,
    timestampHeader: string | undefined,
    replayWindowSeconds: number,
  ): boolean {
    const secret = this.config.webhookSecret;
    if (!secret) {
      return false;
    }
    if (!signatureHeader || !timestampHeader) {
      return false;
    }
    const ts = Number(timestampHeader);
    if (!Number.isFinite(ts)) {
      return false;
    }
    if (Math.abs(Date.now() / 1000 - ts) > replayWindowSeconds) {
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

  private async initiateLive(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentResult> {
    if (
      !this.configured ||
      !this.config.baseUrl ||
      !this.config.apiKey ||
      !this.config.apiSecret
    ) {
      throw new PaymentProviderNotConfiguredError(this.name);
    }
    const base = this.config.baseUrl.replace(/\/$/, '');
    const url = `${base}/v1/payments`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        amountMinor: input.amountMinor,
        currency: input.currency,
        orderId: input.orderId,
        accountReference: input.accountReference,
        description: input.description,
        ...(input.customerSubjectId
          ? { customerId: input.customerSubjectId }
          : {}),
        ...(input.returnUrl ? { returnUrl: input.returnUrl } : {}),
        ...(input.callbackUrl ? { callbackUrl: input.callbackUrl } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        providerReference: `escrow_failed_${input.orderId.slice(0, 8)}`,
        status: 'failed',
        failureReason: `ESCROW_HTTP_${String(response.status)}`,
        raw: { httpStatus: response.status, body: text.slice(0, 500) },
      };
    }

    const body = (await response.json()) as {
      id?: string;
      checkoutId?: string;
      redirectUrl?: string;
      status?: string;
    };
    return {
      providerReference: body.id ?? `escrow_${randomUUID().replace(/-/g, '')}`,
      ...(body.checkoutId ? { providerCheckoutId: body.checkoutId } : {}),
      ...(body.redirectUrl ? { redirectUrl: body.redirectUrl } : {}),
      status: 'pending',
      raw: body,
    };
  }

  private authHeaders(): Record<string, string> {
    const token = Buffer.from(
      `${this.config.apiKey ?? ''}:${this.config.apiSecret ?? ''}`,
      'utf8',
    ).toString('base64');
    return {
      authorization: `Basic ${token}`,
      accept: 'application/json',
    };
  }
}
