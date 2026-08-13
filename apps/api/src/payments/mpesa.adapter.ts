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
}

/**
 * Daraja-style M-Pesa adapter. Sandbox mode simulates STK without real PIN storage.
 * Never logs secrets or PINs.
 */
export class MpesaAdapter implements PaymentProvider {
  readonly name = 'mpesa';

  constructor(private readonly config: MpesaAdapterConfig) {}

  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (!/^\+[1-9]\d{7,14}$/.test(input.msisdnE164)) {
      return Promise.reject(new Error('INVALID_MSISDN'));
    }
    // Simulated sandbox checkout request id — no network in unit tests.
    const providerCheckoutId = `ws_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const providerReference = `mpesa_${createHash('sha256')
      .update(
        `${input.accountReference}:${input.msisdnE164}:${String(input.amountMinor)}`,
      )
      .digest('hex')
      .slice(0, 24)}`;

    if (this.config.env === 'production') {
      if (
        !this.config.consumerKey ||
        !this.config.consumerSecret ||
        !this.config.shortcode ||
        !this.config.passkey
      ) {
        return Promise.reject(new Error('MPESA_CONFIG_INCOMPLETE'));
      }
      // Production would call Daraja STK Push here (outside DB txs).
    }

    return Promise.resolve({
      providerReference,
      providerCheckoutId,
      raw: {
        ResponseCode: '0',
        ResponseDescription: 'Success. Request accepted for processing',
        CheckoutRequestID: providerCheckoutId,
        MerchantRequestID: providerReference,
        CustomerMessage: 'Success. Request accepted for processing',
      },
    });
  }

  query(providerReference: string): Promise<QueryPaymentResult> {
    return Promise.resolve({
      status: 'pending',
      raw: { providerReference, ResultCode: '0' },
    });
  }
}
