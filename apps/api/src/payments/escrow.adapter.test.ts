import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { EscrowAdapter } from './escrow.adapter.js';

describe('EscrowAdapter', () => {
  it('returns not_configured without credentials', async () => {
    const adapter = new EscrowAdapter({});
    expect(adapter.configured).toBe(false);
    const result = await adapter.initiate({
      amountMinor: 1000,
      currency: 'KES',
      orderId: 'order-1',
      accountReference: 'order-1',
      description: 'test',
    });
    expect(result.status).toBe('not_configured');
    expect(result.failureReason).toBe('ESCROW_NOT_CONFIGURED');
  });

  it('test double initiates pending without claiming live money', async () => {
    const adapter = new EscrowAdapter({ allowTestDouble: true });
    const result = await adapter.initiate({
      amountMinor: 2500,
      currency: 'KES',
      orderId: 'order-abc',
      accountReference: 'order-abc',
      description: 'test',
    });
    expect(result.status).toBe('pending');
    expect(result.providerReference).toMatch(/^escrow_test_/);
    expect(result.raw).toMatchObject({ mode: 'test_double' });
  });

  it('verifies HMAC webhook signatures', () => {
    const secret = 'webhook-secret-at-least-32-characters!!';
    const adapter = new EscrowAdapter({
      apiKey: 'k',
      apiSecret: 's',
      baseUrl: 'https://escrow.example.com',
      webhookSecret: secret,
    });
    const rawBody = JSON.stringify({ eventId: 'e1', status: 'paid' });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    expect(
      adapter.verifyWebhookSignature(rawBody, signature, timestamp, 300),
    ).toBe(true);
    expect(
      adapter.verifyWebhookSignature(rawBody, 'bad', timestamp, 300),
    ).toBe(false);
  });
});
