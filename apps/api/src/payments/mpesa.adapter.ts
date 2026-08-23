import { createHash, randomUUID } from 'node:crypto';

import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProvider,
  QueryPaymentResult,
} from './payment-provider.port.js';

export interface MpesaAdapterConfig {
  readonly consumerKey?: string | undefined;
  readonly consumerSecret?: string | undefined;
  readonly shortcode?: string | undefined;
  readonly passkey?: string | undefined;
  readonly callbackUrl?: string | undefined;
  readonly env: 'sandbox' | 'production';
  /** When false (default), refuse initiate — M-Pesa is deferred. */
  readonly enabled?: boolean | undefined;
}

/**
 * Daraja-style M-Pesa adapter — DEFERRED / NOT active customer rail.
 * Kept for future re-enable behind PAYMENT_PROVIDER=mpesa.
 * Does not simulate successful live payments unless explicitly enabled.
 */
export class MpesaAdapter implements PaymentProvider {
  readonly name = 'mpesa';
  readonly configured: boolean;
  private readonly enabled: boolean;

  constructor(private readonly config: MpesaAdapterConfig) {
    this.enabled = config.enabled === true;
    this.configured = Boolean(
      this.enabled &&
        config.consumerKey &&
        config.consumerSecret &&
        config.shortcode &&
        config.passkey,
    );
  }

  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (!this.enabled) {
      return Promise.resolve({
        providerReference: `mpesa_disabled_${input.orderId.slice(0, 8)}`,
        status: 'not_configured',
        failureReason: 'MPESA_DISABLED',
        raw: {
          code: 'MPESA_DISABLED',
          message:
            'M-Pesa is deferred. Active customer payments use escrow (PAYMENT_PROVIDER=escrow).',
        },
      });
    }
    if (!input.msisdnE164 || !/^\+[1-9]\d{7,14}$/.test(input.msisdnE164)) {
      return Promise.reject(new Error('INVALID_MSISDN'));
    }
    if (this.config.env === 'production' && !this.configured) {
      return Promise.resolve({
        providerReference: `mpesa_unconfigured_${input.orderId.slice(0, 8)}`,
        status: 'not_configured',
        failureReason: 'MPESA_CONFIG_INCOMPLETE',
      });
    }
    // Explicitly enabled sandbox only — still not a live Daraja call.
    const providerCheckoutId = `ws_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const providerReference = `mpesa_${createHash('sha256')
      .update(
        `${input.accountReference}:${input.msisdnE164}:${String(input.amountMinor)}`,
      )
      .digest('hex')
      .slice(0, 24)}`;
    return Promise.resolve({
      providerReference,
      providerCheckoutId,
      status: 'pending',
      raw: {
        mode: 'sandbox_simulation',
        warning: 'SANDBOX SIMULATION — not live M-Pesa. Daraja HTTP not implemented.',
        ResponseCode: '0',
        CheckoutRequestID: providerCheckoutId,
        MerchantRequestID: providerReference,
      },
    });
  }

  query(providerReference: string): Promise<QueryPaymentResult> {
    return Promise.resolve({
      status: this.enabled ? 'pending' : 'not_configured',
      raw: { providerReference },
    });
  }
}
