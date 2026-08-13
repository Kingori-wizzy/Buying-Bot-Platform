import { randomBytes } from 'node:crypto';

import {
  hashOpaqueToken,
  type PrismaDatabaseClient,
} from '@buying-bot/database';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { ApiEnv } from '../config/env.js';
import { APP_ENV, DATABASE_CLIENT } from '../config/tokens.js';
import { PricingService } from '../pricing/pricing.service.js';
import type { CartLineBody } from './cart.schemas.js';

interface PricedLine {
  id: string;
  offerId: string;
  skuId: string;
  quantity: number;
  unitPriceMinor: number;
  currency: string;
  lineTotalMinor: number;
  productName?: string;
}

@Injectable()
export class CartService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
    @Inject(PricingService) private readonly pricing: PricingService,
    @Optional() @Inject(APP_ENV) private readonly env?: ApiEnv,
  ) {}

  private prisma() {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'Database is not configured',
      });
    }
    return this.database.prisma;
  }

  private cookieName(): string {
    return this.env?.GUEST_CART_COOKIE ?? 'bb_guest_cart';
  }

  private currency(): string {
    return this.env?.DEFAULT_CURRENCY ?? 'KES';
  }

  ensureGuestCookie(
    request: FastifyRequest,
    reply: FastifyReply,
  ): { token: string; tokenHash: string } {
    const existing = request.cookies[this.cookieName()];
    if (existing && existing.length > 0) {
      return { token: existing, tokenHash: hashOpaqueToken(existing) };
    }
    const token = randomBytes(24).toString('base64url');
    reply.setCookie(this.cookieName(), token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: this.env?.COOKIE_SECURE === true,
      maxAge: 60 * 60 * 24 * 30,
    });
    return { token, tokenHash: hashOpaqueToken(token) };
  }

  async getOrCreateCart(input: {
    readonly userId?: string | undefined;
    readonly guestTokenHash?: string | undefined;
  }): Promise<{ id: string; currency: string; status: string }> {
    const prisma = this.prisma();
    if (input.userId) {
      const existing = await prisma.cart.findFirst({
        where: { userId: input.userId, status: 'ACTIVE' },
      });
      if (existing) {
        return existing;
      }
      return prisma.cart.create({
        data: {
          userId: input.userId,
          currency: this.currency(),
          status: 'ACTIVE',
        },
      });
    }
    if (!input.guestTokenHash) {
      throw new BadRequestException({
        code: 'CART_IDENTITY_REQUIRED',
        message: 'Guest cart token required',
      });
    }
    const existing = await prisma.cart.findFirst({
      where: { guestTokenHash: input.guestTokenHash, status: 'ACTIVE' },
    });
    if (existing) {
      return existing;
    }
    return prisma.cart.create({
      data: {
        guestTokenHash: input.guestTokenHash,
        currency: this.currency(),
        status: 'ACTIVE',
      },
    });
  }

  async getCartView(cartId: string): Promise<{
    id: string;
    currency: string;
    status: string;
    pricedAt: string;
    lines: PricedLine[];
  }> {
    const prisma = this.prisma();
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        lines: {
          include: {
            offer: {
              include: {
                priceWindows: true,
                sku: { include: { variant: { include: { product: true } } } },
              },
            },
          },
        },
      },
    });
    if (cart?.status !== 'ACTIVE') {
      throw new NotFoundException({
        code: 'CART_NOT_FOUND',
        message: 'Cart not found',
      });
    }

    const lines: PricedLine[] = [];
    for (const line of cart.lines) {
      const offer = line.offer;
      if (!offer.active || offer.deletedAt) {
        continue;
      }
      const unit = this.pricing.resolveEffectiveUnitPrice({
        listPriceMinor: offer.listPriceMinor,
        windows: offer.priceWindows,
      });
      lines.push({
        id: line.id,
        offerId: line.offerId,
        skuId: line.skuId,
        quantity: line.quantity,
        unitPriceMinor: unit,
        currency: offer.currency,
        lineTotalMinor: unit * line.quantity,
        productName: offer.sku.variant.product.name,
      });
    }

    return {
      id: cart.id,
      currency: cart.currency,
      status: cart.status,
      pricedAt: new Date().toISOString(),
      lines,
    };
  }

  async addLine(cartId: string, body: CartLineBody): Promise<unknown> {
    const prisma = this.prisma();
    const offer = await prisma.offer.findFirst({
      where: { id: body.offerId, active: true, deletedAt: null },
      include: {
        sku: { include: { variant: { include: { product: true } } } },
      },
    });
    if (offer?.sku.variant.product.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'OFFER_UNAVAILABLE',
        message: 'Offer is not available',
      });
    }

    await prisma.cartLine.upsert({
      where: {
        cartId_offerId: { cartId, offerId: body.offerId },
      },
      create: {
        cartId,
        offerId: body.offerId,
        skuId: offer.skuId,
        quantity: body.quantity,
      },
      update: {
        quantity: { increment: body.quantity },
      },
    });
    return this.getCartView(cartId);
  }

  async updateLine(
    cartId: string,
    lineId: string,
    quantity: number,
  ): Promise<unknown> {
    const prisma = this.prisma();
    const line = await prisma.cartLine.findFirst({
      where: { id: lineId, cartId },
    });
    if (!line) {
      throw new NotFoundException({
        code: 'LINE_NOT_FOUND',
        message: 'Line not found',
      });
    }
    await prisma.cartLine.update({
      where: { id: lineId },
      data: { quantity },
    });
    return this.getCartView(cartId);
  }

  async removeLine(cartId: string, lineId: string): Promise<unknown> {
    const prisma = this.prisma();
    await prisma.cartLine.deleteMany({ where: { id: lineId, cartId } });
    return this.getCartView(cartId);
  }

  /**
   * Merge guest cart into authenticated cart (ADR-0011 §7).
   */
  async mergeOnLogin(input: {
    readonly userId: string;
    readonly guestTokenHash?: string | undefined;
  }): Promise<{
    cartId: string;
    merged: boolean;
    droppedOfferIds: string[];
  }> {
    const prisma = this.prisma();
    const survivor = await this.getOrCreateCart({ userId: input.userId });
    if (!input.guestTokenHash) {
      return { cartId: survivor.id, merged: false, droppedOfferIds: [] };
    }
    const guest = await prisma.cart.findFirst({
      where: { guestTokenHash: input.guestTokenHash, status: 'ACTIVE' },
      include: { lines: true },
    });
    if (!guest || guest.id === survivor.id) {
      return { cartId: survivor.id, merged: false, droppedOfferIds: [] };
    }

    const droppedOfferIds: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const line of guest.lines) {
        const offer = await tx.offer.findFirst({
          where: { id: line.offerId, active: true, deletedAt: null },
          include: {
            sku: { include: { variant: { include: { product: true } } } },
          },
        });
        if (offer?.sku.variant.product.status !== 'ACTIVE') {
          droppedOfferIds.push(line.offerId);
          continue;
        }
        const existing = await tx.cartLine.findUnique({
          where: {
            cartId_offerId: { cartId: survivor.id, offerId: line.offerId },
          },
        });
        if (existing) {
          await tx.cartLine.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + line.quantity },
          });
        } else {
          await tx.cartLine.create({
            data: {
              cartId: survivor.id,
              offerId: line.offerId,
              skuId: line.skuId,
              quantity: line.quantity,
            },
          });
        }
      }
      await tx.cart.update({
        where: { id: guest.id },
        data: { status: 'CONVERTED' },
      });
    });

    return { cartId: survivor.id, merged: true, droppedOfferIds };
  }
}
