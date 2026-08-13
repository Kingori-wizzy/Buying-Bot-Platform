import { deterministicEmbedding } from '@buying-bot/ai-core';
import type { PrismaClient, PrismaDatabaseClient } from '@buying-bot/database';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { issueServiceJwt } from '../auth/service-jwt.js';
import { CartService } from '../cart/cart.service.js';
import { CatalogService } from '../catalog/catalog.service.js';
import type { ApiEnv } from '../config/env.js';
import { APP_ENV, DATABASE_CLIENT } from '../config/tokens.js';
import { PricingService } from '../pricing/pricing.service.js';
import type { ChatBody, RetrieveBody, ToolArgs } from './ai.schemas.js';

export interface RetrievalResult {
  readonly chunkId: string;
  readonly documentId: string;
  readonly score: number;
  readonly excerpt: string;
}

@Injectable()
export class AiService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
    @Inject(APP_ENV) private readonly env: ApiEnv,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(CartService) private readonly carts: CartService,
    @Inject(PricingService) private readonly pricing: PricingService,
  ) {}

  async chat(
    body: ChatBody,
    actingSubjectId: string,
    realm: 'customer' | 'admin',
  ): Promise<unknown> {
    const conversationId = await this.persistUserMessage(
      body,
      actingSubjectId,
      realm,
    );
    const response = await this.callAi('/v1/chat', {
      messages: [{ role: 'user', content: body.message }],
      conversationId,
      actingSubjectId,
      realm,
      queryForRetrieve: body.message,
      enableTools: true,
    });
    const result: unknown = await response.json();
    const content = this.readString(result, 'content');
    if (content) {
      await this.prisma().conversationMessage.create({
        data: { conversationId, role: 'assistant', content },
      });
    }
    return { conversationId, result };
  }

  async streamChat(
    body: ChatBody,
    actingSubjectId: string,
    realm: 'customer' | 'admin',
  ): Promise<{ readonly conversationId: string; readonly response: Response }> {
    const conversationId = await this.persistUserMessage(
      body,
      actingSubjectId,
      realm,
    );
    const response = await this.callAi('/v1/chat/stream', {
      messages: [{ role: 'user', content: body.message }],
      conversationId,
      actingSubjectId,
      realm,
      queryForRetrieve: body.message,
      enableTools: true,
    });
    return { conversationId, response };
  }

  async retrieve(body: RetrieveBody): Promise<RetrievalResult[]> {
    const prisma = this.prisma();
    const embedding =
      body.embedding ?? deterministicEmbedding(body.query, 1536);
    const vector = `[${embedding.map((value) => String(value)).join(',')}]`;

    let vectorRows: RetrievalResult[] = [];
    try {
      vectorRows = await prisma.$queryRawUnsafe<RetrievalResult[]>(
        `SELECT c.id as "chunkId", c.document_id as "documentId",
          1 - (e.embedding <=> $1::vector) as score,
          left(c.content, 400) as excerpt
        FROM ai.embeddings e
        JOIN ai.knowledge_chunks c ON c.id = e.chunk_id
        WHERE e.embedding IS NOT NULL
        ORDER BY e.embedding <=> $1::vector
        LIMIT $2`,
        vector,
        body.limit,
      );
    } catch {
      // FTS remains available when pgvector is unavailable or dimensions differ.
    }

    const textRows = await prisma.$queryRawUnsafe<RetrievalResult[]>(
      `SELECT c.id as "chunkId", c.document_id as "documentId",
        0.55::float8 as score, left(c.content, 400) as excerpt
       FROM ai.knowledge_chunks c
       JOIN ai.knowledge_documents d ON d.id = c.document_id
       WHERE d.status = 'READY' AND c.content ILIKE '%' || $1 || '%'
       ORDER BY c.created_at DESC LIMIT $2`,
      body.query,
      body.limit,
    );

    const merged = new Map<string, RetrievalResult>();
    for (const row of [...vectorRows, ...textRows]) {
      const current = merged.get(row.chunkId);
      if (!current || row.score > current.score) {
        merged.set(row.chunkId, row);
      }
    }
    return [...merged.values()]
      .sort((left, right) => right.score - left.score)
      .slice(0, body.limit);
  }

  async executeTool(
    name: string,
    args: ToolArgs,
    actingSubjectId: string,
    realm: 'customer' | 'admin',
  ): Promise<unknown> {
    let result: unknown;
    let ok = false;
    try {
      result = await this.runTool(name, args, actingSubjectId, realm);
      ok = true;
      return result;
    } finally {
      await this.prisma().toolExecution.create({
        data: {
          toolName: name,
          actingSubject: actingSubjectId,
          argsJson: this.asJson(args),
          ...(result !== undefined ? { resultJson: this.asJson(result) } : {}),
          ok,
        },
      });
    }
  }

  private async runTool(
    name: string,
    args: ToolArgs,
    subjectId: string,
    realm: 'customer' | 'admin',
  ): Promise<unknown> {
    switch (name) {
      case 'searchProducts':
        return this.catalog.searchProducts({
          q: this.requiredString(args, 'query'),
          page: 1,
          pageSize: 10,
        });
      case 'getProduct':
        return this.catalog.getProduct(
          this.optionalString(args, 'productId') ??
            this.requiredString(args, 'slug'),
        );
      case 'getOfferPrice':
        return this.getOfferPrice(this.requiredString(args, 'offerId'));
      case 'checkStock':
        return this.checkStock(
          this.requiredString(args, 'skuId'),
          this.optionalString(args, 'locationId'),
        );
      case 'getCart':
        return this.getOwnedCart(subjectId, realm);
      case 'addToCart': {
        const cart = await this.getOwnedCart(subjectId, realm);
        return this.carts.addLine(cart.id, {
          offerId: this.requiredString(args, 'offerId'),
          quantity: this.positiveInteger(args, 'quantity', 1),
        });
      }
      case 'getOrderStatus':
        return this.getOwnedOrder(
          this.requiredString(args, 'orderId'),
          subjectId,
          realm,
        );
      case 'recommendProducts':
        return this.catalog.searchProducts({
          q: this.optionalString(args, 'query'),
          page: 1,
          pageSize: this.positiveInteger(args, 'limit', 5),
        });
      case 'explainPricing':
        return this.explainPricing(
          this.requiredString(args, 'offerId'),
          this.positiveInteger(args, 'quantity', 1),
        );
      default:
        throw new BadRequestException({
          code: 'UNKNOWN_AI_TOOL',
          message: `Unsupported AI tool: ${name}`,
        });
    }
  }

  private async getOfferPrice(offerId: string): Promise<unknown> {
    const offer = await this.prisma().offer.findFirst({
      where: { id: offerId, active: true, deletedAt: null },
      include: { priceWindows: true },
    });
    if (!offer) {
      throw new NotFoundException({
        code: 'OFFER_NOT_FOUND',
        message: 'Offer not found',
      });
    }
    return {
      offerId: offer.id,
      unitPriceMinor: this.pricing.resolveEffectiveUnitPrice({
        listPriceMinor: offer.listPriceMinor,
        windows: offer.priceWindows,
      }),
      currency: offer.currency,
      authoritative: true,
    };
  }

  private async checkStock(
    skuId: string,
    locationId?: string,
  ): Promise<unknown> {
    const balances = await this.prisma().inventoryBalance.findMany({
      where: { skuId, ...(locationId ? { locationId } : {}) },
    });
    return {
      skuId,
      available: balances.reduce(
        (total, row) => total + row.onHand - row.reserved,
        0,
      ),
      balances: balances.map((row) => ({
        locationId: row.locationId,
        available: row.onHand - row.reserved,
      })),
      authoritative: true,
    };
  }

  private async getOwnedCart(
    subjectId: string,
    realm: 'customer' | 'admin',
  ): Promise<{ id: string; currency: string; status: string }> {
    if (realm !== 'customer') {
      throw new ForbiddenException('Customer realm required');
    }
    return this.carts.getOrCreateCart({ userId: subjectId });
  }

  private async getOwnedOrder(
    orderId: string,
    subjectId: string,
    realm: 'customer' | 'admin',
  ): Promise<unknown> {
    const order = await this.prisma().order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (realm === 'customer' && order.userId !== subjectId) {
      throw new ForbiddenException('Not your order');
    }
    return {
      id: order.id,
      status: order.status,
      payableMinor: order.payableMinor,
      currency: order.currency,
      items: order.items,
    };
  }

  private async explainPricing(
    offerId: string,
    quantity: number,
  ): Promise<unknown> {
    const price = await this.getOfferPrice(offerId);
    const unitPriceMinor = this.readNumber(price, 'unitPriceMinor');
    return {
      ...this.asRecord(price),
      quantity,
      lineTotalMinor: unitPriceMinor * quantity,
      explanation: 'Calculated from the authoritative active offer price.',
    };
  }

  private async persistUserMessage(
    body: ChatBody,
    subjectId: string,
    realm: 'customer' | 'admin',
  ): Promise<string> {
    const prisma = this.prisma();
    let conversationId = body.conversationId;
    if (conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: subjectId },
      });
      if (!conversation) {
        throw new ForbiddenException('Conversation not found');
      }
    } else {
      const conversation = await prisma.conversation.create({
        data: {
          userId: subjectId,
          realm: realm === 'admin' ? 'ADMIN' : 'CUSTOMER',
          title: body.message.slice(0, 80),
        },
      });
      conversationId = conversation.id;
    }
    await prisma.conversationMessage.create({
      data: { conversationId, role: 'user', content: body.message },
    });
    return conversationId;
  }

  private async callAi(path: string, payload: unknown): Promise<Response> {
    const token = await issueServiceJwt({
      secret: this.env.SERVICE_JWT_SECRET,
      serviceName: 'api',
      audience: 'ai-service',
    });
    const baseUrl = this.env.AI_SERVICE_BASE_URL ?? 'http://127.0.0.1:3003';
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new ServiceUnavailableException({
        code: 'AI_SERVICE_UNAVAILABLE',
        message:
          'AI service is unreachable; commerce continues without assistant',
      });
    }
    if (!response.ok) {
      throw new BadGatewayException({
        code: 'AI_SERVICE_ERROR',
        message: `AI service returned ${String(response.status)}`,
      });
    }
    return response;
  }

  private prisma(): PrismaClient {
    if (!this.database) {
      throw new BadRequestException({
        code: 'DATABASE_REQUIRED',
        message: 'Database is not configured',
      });
    }
    return this.database.prisma;
  }

  private requiredString(args: ToolArgs, key: string): string {
    const value = args[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${key} is required`);
    }
    return value.trim();
  }

  private optionalString(args: ToolArgs, key: string): string | undefined {
    const value = args[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private positiveInteger(
    args: ToolArgs,
    key: string,
    fallback: number,
  ): number {
    const value = args[key] ?? fallback;
    if (!Number.isInteger(value) || typeof value !== 'number' || value < 1) {
      throw new BadRequestException(`${key} must be a positive integer`);
    }
    return value;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  }

  private asJson(value: unknown): object {
    return JSON.parse(JSON.stringify(value)) as object;
  }

  private readString(value: unknown, key: string): string | undefined {
    const candidate = this.asRecord(value)[key];
    return typeof candidate === 'string' ? candidate : undefined;
  }

  private readNumber(value: unknown, key: string): number {
    const candidate = this.asRecord(value)[key];
    if (typeof candidate !== 'number') {
      throw new Error(`Missing numeric ${key}`);
    }
    return candidate;
  }
}
