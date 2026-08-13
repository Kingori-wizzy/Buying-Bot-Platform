import { hashOpaqueToken } from '@buying-bot/database';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth.service.js';
import type { AuthedRequest } from '../auth/auth.types.js';
import { CsrfGuard, Public, SessionAuthGuard } from '../auth/guards.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { ApiEnv } from '../config/env.js';
import { APP_ENV } from '../config/tokens.js';
import {
  type CartLineBody,
  cartLineBodySchema,
  type UpdateCartLineBody,
  updateCartLineSchema,
} from './cart.schemas.js';
import { CartService } from './cart.service.js';

@Controller('v1/cart')
@UseGuards(CsrfGuard, SessionAuthGuard)
export class CartController {
  constructor(
    @Inject(CartService) private readonly carts: CartService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(APP_ENV) private readonly env: ApiEnv,
  ) {}

  private async resolveActor(
    request: FastifyRequest,
  ): Promise<{ userId?: string; guestTokenHash?: string }> {
    const principal = await this.auth.resolvePrincipalFromRequest(request);
    if (principal) {
      return { userId: principal.subjectId };
    }
    const token = request.cookies[this.env.GUEST_CART_COOKIE];
    if (token) {
      return { guestTokenHash: hashOpaqueToken(token) };
    }
    return {};
  }

  @Get()
  @Public()
  async get(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    let actor = await this.resolveActor(request);
    if (!actor.userId && !actor.guestTokenHash) {
      const guest = this.carts.ensureGuestCookie(request, reply);
      actor = { guestTokenHash: guest.tokenHash };
    }
    const cart = await this.carts.getOrCreateCart(actor);
    return this.carts.getCartView(cart.id);
  }

  @Post('items')
  @Public()
  async add(
    @Body(new ZodValidationPipe(cartLineBodySchema)) body: CartLineBody,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    let actor = await this.resolveActor(request);
    if (!actor.userId && !actor.guestTokenHash) {
      const guest = this.carts.ensureGuestCookie(request, reply);
      actor = { guestTokenHash: guest.tokenHash };
    }
    const cart = await this.carts.getOrCreateCart(actor);
    return this.carts.addLine(cart.id, body);
  }

  @Patch('items/:lineId')
  @Public()
  async update(
    @Param('lineId') lineId: string,
    @Body(new ZodValidationPipe(updateCartLineSchema)) body: UpdateCartLineBody,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    let actor = await this.resolveActor(request);
    if (!actor.userId && !actor.guestTokenHash) {
      const guest = this.carts.ensureGuestCookie(request, reply);
      actor = { guestTokenHash: guest.tokenHash };
    }
    const cart = await this.carts.getOrCreateCart(actor);
    return this.carts.updateLine(cart.id, lineId, body.quantity);
  }

  @Delete('items/:lineId')
  @Public()
  async remove(
    @Param('lineId') lineId: string,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    let actor = await this.resolveActor(request);
    if (!actor.userId && !actor.guestTokenHash) {
      const guest = this.carts.ensureGuestCookie(request, reply);
      actor = { guestTokenHash: guest.tokenHash };
    }
    const cart = await this.carts.getOrCreateCart(actor);
    return this.carts.removeLine(cart.id, lineId);
  }

  @Post('merge')
  async merge(@Req() request: AuthedRequest): Promise<unknown> {
    const principal = request.authPrincipal;
    if (!principal) {
      return { merged: false };
    }
    const token = request.cookies[this.env.GUEST_CART_COOKIE];
    return this.carts.mergeOnLogin({
      userId: principal.subjectId,
      ...(token ? { guestTokenHash: hashOpaqueToken(token) } : {}),
    });
  }
}
