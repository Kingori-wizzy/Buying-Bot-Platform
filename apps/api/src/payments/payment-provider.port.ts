export interface InitiatePaymentInput {
  readonly amountMinor: number;
  readonly currency: string;
  readonly msisdnE164: string;
  readonly accountReference: string;
  readonly description: string;
  readonly callbackUrl?: string | undefined;
}

export interface InitiatePaymentResult {
  readonly providerReference: string;
  readonly providerCheckoutId?: string | undefined;
  readonly raw?: unknown;
}

export interface QueryPaymentResult {
  readonly status: 'pending' | 'confirmed' | 'failed';
  readonly providerTxnId?: string | undefined;
  readonly amountMinor?: number | undefined;
  readonly currency?: string | undefined;
  readonly raw?: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  query(providerReference: string): Promise<QueryPaymentResult>;
}
