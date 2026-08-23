/**
 * Payment provider port (ADR-0011).
 * Escrow is the active customer payment provider.
 * M-Pesa remains available as a deferred adapter only.
 */

export interface InitiatePaymentInput {
  readonly amountMinor: number;
  readonly currency: string;
  readonly accountReference: string;
  readonly description: string;
  readonly orderId: string;
  /** Optional — legacy M-Pesa STK only; not used by escrow. */
  readonly msisdnE164?: string | undefined;
  readonly customerSubjectId?: string | undefined;
  readonly returnUrl?: string | undefined;
  readonly callbackUrl?: string | undefined;
}

export interface InitiatePaymentResult {
  readonly providerReference: string;
  readonly providerCheckoutId?: string | undefined;
  /** Provider-hosted checkout / escrow session URL when available. */
  readonly redirectUrl?: string | undefined;
  readonly raw?: unknown;
  readonly status?: 'pending' | 'not_configured' | 'failed' | undefined;
  readonly failureReason?: string | undefined;
}

export interface QueryPaymentResult {
  readonly status: 'pending' | 'confirmed' | 'failed' | 'not_configured';
  readonly providerTxnId?: string | undefined;
  readonly amountMinor?: number | undefined;
  readonly currency?: string | undefined;
  readonly raw?: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  readonly configured: boolean;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  query(providerReference: string): Promise<QueryPaymentResult>;
}

export class PaymentProviderNotConfiguredError extends Error {
  readonly code = 'PAYMENT_PROVIDER_NOT_CONFIGURED';

  constructor(providerName: string) {
    super(
      `${providerName} is not configured — set provider credentials before initiating payments`,
    );
    this.name = 'PaymentProviderNotConfiguredError';
  }
}
