import type { AuthPrincipal } from '@buying-bot/auth';
import { hashOpaqueToken } from '@buying-bot/database';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth.service.js';
import {
  CsrfGuard,
  CurrentUser,
  Public,
  SessionAuthGuard,
} from '../auth/guards.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { ApiEnv } from '../config/env.js';
import { APP_ENV } from '../config/tokens.js';
import { type CheckoutBody, checkoutBodySchema } from './checkout.schemas.js';
import { CheckoutService } from './checkout.service.js';

@Controller('v1')
@UseGuards(CsrfGuard, SessionAuthGuard)
export class CheckoutController {
  constructor(
    @Inject(CheckoutService) private readonly checkout: CheckoutService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(APP_ENV) private readonly env: ApiEnv,
  ) {}

  @Post('checkout')
  @Public()
  async create(
    @Body(new ZodValidationPipe(checkoutBodySchema)) body: CheckoutBody,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: FastifyRequest,
  ): Promise<unknown> {
    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required',
      });
    }
    const principal = await this.auth.resolvePrincipalFromRequest(request);
    const guestToken = request.cookies[this.env.GUEST_CART_COOKIE];
    return this.checkout.checkout({
      ...(principal?.subjectId !== undefined
        ? { userId: principal.subjectId }
        : {}),
      ...(guestToken ? { guestTokenHash: hashOpaqueToken(guestToken) } : {}),
      idempotencyKey: idempotencyKey.trim(),
      body,
    });
  }

  @Get('orders/me')
  async myOrders(@CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.checkout.listMyOrders(user.subjectId);
  }

  @Get('orders/:id')
  @Public()
  async getOrder(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ): Promise<unknown> {
    const principal = await this.auth.resolvePrincipalFromRequest(request);
    return this.checkout.getOrder(id, principal?.subjectId);
  }

  @Post('orders/:id/cancel')
  @Public()
  async cancel(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ): Promise<unknown> {
    const principal = await this.auth.resolvePrincipalFromRequest(request);
    return this.checkout.cancelBeforePay(id, principal?.subjectId);
  }
}
