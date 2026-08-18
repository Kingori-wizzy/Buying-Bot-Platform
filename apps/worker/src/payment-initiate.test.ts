import { describe, expect, it, vi } from 'vitest';

import { initiatePaymentFromOutbox } from './payment-initiate.js';

describe('initiatePaymentFromOutbox', () => {
  it('updates payment attempt to INITIATED in sandbox mode', async () => {
    const attemptId = 'attempt-1';
    const paymentId = 'payment-1';
    const updates: unknown[] = [];

    const prisma = {
      paymentAttempt: {
        findUnique: vi.fn().mockResolvedValue({
          id: attemptId,
          status: 'CREATED',
        }),
      },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          paymentAttempt: {
            update: vi.fn((args: unknown) => {
              updates.push(args);
            }),
          },
          payment: {
            update: vi.fn((args: unknown) => {
              updates.push(args);
            }),
          },
        };
        await fn(tx);
      }),
    };

    await initiatePaymentFromOutbox(
      prisma as never,
      {
        orderId: 'order-abc-123',
        paymentId,
        attemptId,
        msisdnE164: '+254712345678',
        amountMinor: 19900,
        currency: 'KES',
      },
      { env: 'sandbox' },
    );

    expect(prisma.paymentAttempt.findUnique).toHaveBeenCalledWith({
      where: { id: attemptId },
    });
    expect(updates.length).toBe(2);
  });

  it('skips when attempt already INITIATED', async () => {
    const prisma = {
      paymentAttempt: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'attempt-1',
          status: 'INITIATED',
        }),
      },
      $transaction: vi.fn(),
    };

    await initiatePaymentFromOutbox(
      prisma as never,
      {
        orderId: 'order-1',
        paymentId: 'payment-1',
        attemptId: 'attempt-1',
        msisdnE164: '+254712345678',
        amountMinor: 100,
        currency: 'KES',
      },
      { env: 'sandbox' },
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
