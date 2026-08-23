import {
  Controller,
  Headers,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import {
  CsrfGuard,
  Public,
  SessionAuthGuard,
  SkipCsrf,
} from '../auth/guards.js';
import { PaymentsService } from './payments.service.js';

@Controller('v1/webhooks/payments')
@UseGuards(CsrfGuard, SessionAuthGuard)
export class PaymentsWebhookController {
  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
  ) {}

  @Post('escrow')
  @Public()
  @SkipCsrf()
  async escrow(
    @Req() request: FastifyRequest,
    @Headers('x-escrow-signature') signature: string | undefined,
    @Headers('x-escrow-timestamp') timestamp: string | undefined,
  ): Promise<{ ok: true; accepted: boolean }> {
    const rawBody =
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body ?? {});
    const payload =
      typeof request.body === 'object' && request.body !== null
        ? (request.body as {
            eventId?: string;
            id?: string;
            status?: string;
            orderId?: string;
            providerTxnId?: string;
            amountMinor?: number;
            currency?: string;
          })
        : {};

    return this.payments.handleEscrowWebhook({
      rawBody,
      signature,
      timestamp,
      payload,
    });
  }

  /** Deferred — M-Pesa is not the active customer payment rail. */
  @Post('mpesa')
  @Public()
  @SkipCsrf()
  async mpesa(
    @Req() request: FastifyRequest,
    @Headers('x-mpesa-signature') signature: string | undefined,
    @Headers('x-mpesa-timestamp') timestamp: string | undefined,
  ): Promise<{ ok: true; accepted: boolean; deferred: true }> {
    const rawBody =
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body ?? {});
    return this.payments.handleMpesaWebhook({
      rawBody,
      signature,
      timestamp,
      payload:
        typeof request.body === 'object' && request.body !== null
          ? (request.body as Record<string, unknown>)
          : {},
    });
  }
}
