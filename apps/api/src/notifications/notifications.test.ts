import type { PrismaDatabaseClient } from '@buying-bot/database';
import { describe, expect, it } from 'vitest';

import {
  ConsoleSmsProvider,
  RecordingEmailProvider,
  StubWhatsAppProvider,
} from './notification.ports.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  it('delivers a pending email intent through the recording provider', async () => {
    const intents: Record<string, unknown>[] = [];
    const deliveries: Record<string, unknown>[] = [];
    const fakePrisma = {
      notificationIntent: {
        upsert: (query: { create: Record<string, unknown> }) => {
          const row = {
            id: 'intent-1',
            status: 'PENDING',
            attempts: 0,
            createdAt: new Date(),
            availableAt: new Date(),
            ...query.create,
          };
          intents.push(row);
          return Promise.resolve(row);
        },
        findMany: () => Promise.resolve(intents),
        updateMany: () => Promise.resolve({ count: 1 }),
        update: (query: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const row = intents.find((item) => item.id === query.where.id);
          Object.assign(row ?? {}, query.data);
          return Promise.resolve(row);
        },
      },
      notificationDelivery: {
        create: (query: { data: Record<string, unknown> }) => {
          deliveries.push(query.data);
          return Promise.resolve(query.data);
        },
      },
      $transaction: (operations: readonly Promise<unknown>[]) =>
        Promise.all(operations),
    };
    const database = {
      prisma: fakePrisma,
    } as unknown as PrismaDatabaseClient;
    const email = new RecordingEmailProvider();
    const service = new NotificationsService(
      database,
      email,
      new ConsoleSmsProvider(),
      new StubWhatsAppProvider(),
    );

    await service.createIntent({
      type: 'order.created',
      channel: 'EMAIL',
      recipient: 'buyer@example.test',
      templateCode: 'order-created',
      payload: { subject: 'Order created', body: 'Thanks for your order.' },
      idempotencyKey: 'notification-test-1',
    });

    expect(await service.processPendingIntents()).toBe(1);
    expect(email.messages).toHaveLength(1);
    expect(deliveries).toHaveLength(1);
    expect(intents[0]?.status).toBe('DELIVERED');
  });
});
