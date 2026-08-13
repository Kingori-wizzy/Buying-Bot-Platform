import type { PrismaDatabaseClient } from '@buying-bot/database';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { DATABASE_CLIENT } from '../config/tokens.js';
import {
  ConsoleSmsProvider,
  RecordingEmailProvider,
  StubWhatsAppProvider,
} from './notification.ports.js';

export interface CreateNotificationIntent {
  readonly type: string;
  readonly channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  readonly recipient: string;
  readonly templateCode: string;
  readonly payload: Record<string, unknown>;
  readonly idempotencyKey: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
    @Inject(RecordingEmailProvider)
    private readonly email: RecordingEmailProvider,
    @Inject(ConsoleSmsProvider) private readonly sms: ConsoleSmsProvider,
    @Inject(StubWhatsAppProvider)
    private readonly whatsapp: StubWhatsAppProvider,
  ) {}

  async createIntent(input: CreateNotificationIntent): Promise<unknown> {
    const prisma = this.prisma();
    return prisma.notificationIntent.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: {
        type: input.type,
        channel: input.channel,
        recipient: input.recipient,
        templateCode: input.templateCode,
        payloadJson: this.jsonObject(input.payload),
        idempotencyKey: input.idempotencyKey,
      },
      update: {},
    });
  }

  async processPendingIntents(limit = 20): Promise<number> {
    const prisma = this.prisma();
    const intents = await prisma.notificationIntent.findMany({
      where: { status: 'PENDING', availableAt: { lte: new Date() } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    let delivered = 0;
    for (const intent of intents) {
      const claimed = await prisma.notificationIntent.updateMany({
        where: { id: intent.id, status: 'PENDING' },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });
      if (claimed.count !== 1) {
        continue;
      }
      try {
        const payload = this.asRecord(intent.payloadJson);
        const body =
          typeof payload.body === 'string'
            ? payload.body
            : JSON.stringify(payload);
        const subject =
          typeof payload.subject === 'string' ? payload.subject : undefined;
        const message = {
          recipient: intent.recipient,
          body,
          ...(subject ? { subject } : {}),
        };
        const receipt =
          intent.channel === 'EMAIL'
            ? await this.email.send(message)
            : intent.channel === 'SMS'
              ? await this.sms.send(message)
              : await this.whatsapp.send(message);
        await prisma.$transaction([
          prisma.notificationDelivery.create({
            data: {
              intentId: intent.id,
              channel: intent.channel,
              status: 'SENT',
              provider: receipt.provider,
              providerRef: receipt.reference,
              attemptKey: `${intent.id}:${String(intent.attempts + 1)}`,
              sentAt: new Date(),
            },
          }),
          prisma.notificationIntent.update({
            where: { id: intent.id },
            data: { status: 'DELIVERED', lastError: null },
          }),
        ]);
        delivered += 1;
      } catch (error: unknown) {
        await prisma.notificationIntent.update({
          where: { id: intent.id },
          data: {
            status: 'FAILED',
            lastError:
              error instanceof Error ? error.message.slice(0, 500) : 'unknown',
          },
        });
      }
    }
    return delivered;
  }

  private prisma() {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'Database is not configured',
      });
    }
    return this.database.prisma;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  }

  private jsonObject(value: Record<string, unknown>): object {
    return JSON.parse(JSON.stringify(value)) as object;
  }
}
