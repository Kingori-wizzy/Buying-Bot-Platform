import { describe, expect, it, vi } from 'vitest';

import { initiatePaymentFromOutbox } from './payment-initiate.js';

describe('initiatePaymentFromOutbox', () => {
  it('updates payment attempt to INITIATED with escrow test double', async () => {
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
        amountMinor: 19900,
        currency: 'KES',
      },
      {
        provider: 'escrow',
        escrow: { allowTestDouble: true },
      },
    );

    expect(prisma.paymentAttempt.findUnique).toHaveBeenCalledWith({
      where: { id: attemptId },
    });
    expect(updates.length).toBe(2);
  });

  it('marks FAILED with ESCROW_NOT_CONFIGURED when keys missing', async () => {
    const updates: unknown[] = [];
    const prisma = {
      paymentAttempt: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'attempt-1',
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
        orderId: 'order-1',
        paymentId: 'payment-1',
        attemptId: 'attempt-1',
        amountMinor: 100,
        currency: 'KES',
      },
      { provider: 'escrow', escrow: {} },
    );

    expect(updates.length).toBe(2);
    expect(JSON.stringify(updates)).toContain('ESCROW_NOT_CONFIGURED');
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
        amountMinor: 100,
        currency: 'KES',
      },
      { provider: 'escrow', escrow: { allowTestDouble: true } },
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
