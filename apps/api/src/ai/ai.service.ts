import {
  deterministicEmbedding,
  enrichSearchToolArgs,
} from '@buying-bot/ai-core';
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

export interface ConversationMessageView {
  readonly id: string;
  readonly role: string;
  readonly content: string;
  readonly createdAt: string;
  readonly products?: readonly Record<string, unknown>[];
}

const MAX_HISTORY_MESSAGES = 24;

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
    const messages = await this.loadConversationModelMessages(
      conversationId,
      actingSubjectId,
    );
    const response = await this.callAi('/v1/chat', {
      messages,
      conversationId,
      actingSubjectId,
      realm,
      queryForRetrieve: body.message,
      enableTools: true,
    });
    const result: unknown = await response.json();
    const content = this.readString(result, 'content');
    const products = this.readProducts(result);
    if (content) {
      await this.persistAssistantMessage(conversationId, content, {
        citationsJson: this.readCitations(result),
        ...(products ? { products } : {}),
      });
    }
    return { conversationId, result: { ...this.asRecord(result), products } };
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
    const messages = await this.loadConversationModelMessages(
      conversationId,
      actingSubjectId,
    );
    const upstream = await this.callAi('/v1/chat/stream', {
      messages,
      conversationId,
      actingSubjectId,
      realm,
      queryForRetrieve: body.message,
      enableTools: true,
    });

    const response = this.wrapStreamForPersistence(
      upstream,
      conversationId,
    );
    return { conversationId, response };
  }

  async getConversation(
    conversationId: string,
    actingSubjectId: string,
  ): Promise<{
    readonly conversationId: string;
    readonly messages: readonly ConversationMessageView[];
  }> {
    const prisma = this.prisma();
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: actingSubjectId },
    });
    if (!conversation) {
      throw new ForbiddenException('Conversation not found');
    }
    const rows = await prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: MAX_HISTORY_MESSAGES,
    });
    return {
      conversationId,
      messages: rows.map((row) => {
        const storedProducts = this.readStoredProducts(row.citationsJson);
        return {
          id: row.id,
          role: row.role,
          content: row.content,
          createdAt: row.createdAt.toISOString(),
          ...(storedProducts ? { products: storedProducts } : {}),
        };
      }),
    };
  }

  async persistAssistantMessage(
    conversationId: string,
    content: string,
    metadata: {
      readonly citationsJson?: unknown;
      readonly products?: readonly Record<string, unknown>[];
    } = {},
  ): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed) {
      return;
    }
    const prisma = this.prisma();
    const latest = await prisma.conversationMessage.findFirst({
      where: { conversationId, role: 'assistant' },
      orderBy: { createdAt: 'desc' },
    });
    if (latest?.content === trimmed) {
      return;
    }
    const citationsJson =
      metadata.products && metadata.products.length > 0
        ? {
            products: metadata.products,
            ...(metadata.citationsJson ? { citations: metadata.citationsJson } : {}),
          }
        : metadata.citationsJson;

    await prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: trimmed,
        ...(citationsJson !== undefined
          ? { citationsJson: this.asJson(citationsJson) }
          : {}),
      },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  async retrieve(body: RetrieveBody): Promise<{
    citations: {
      chunkId: string;
      documentId: string;
      score: number;
      excerpt: string;
    }[];
  }> {
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
    return {
      citations: [...merged.values()]
        .sort((left, right) => right.score - left.score)
        .slice(0, body.limit)
        .map((row) => ({
          chunkId: row.chunkId,
          documentId: row.documentId,
          score: row.score,
          excerpt: row.excerpt,
        })),
    };
  }

  async executeTool(
    name: string,
    args: ToolArgs,
    actingSubjectId: string,
    realm: 'customer' | 'admin',
    conversationId?: string,
  ): Promise<unknown> {
    let result: unknown;
    let ok = false;
    try {
      result = await this.runTool(
        name,
        args,
        actingSubjectId,
        realm,
        conversationId,
      );
      ok = true;
      return result;
    } finally {
      await this.prisma().toolExecution.create({
        data: {
          toolName: name,
          actingSubject: actingSubjectId,
          argsJson: this.asJson(args),
          ...(conversationId ? { conversationId } : {}),
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
    conversationId?: string,
  ): Promise<unknown> {
    const userMessages = conversationId
      ? await this.loadConversationUserMessages(conversationId, subjectId)
      : [];

    switch (name) {
      case 'searchProducts': {
        const enriched = enrichSearchToolArgs(args, userMessages);
        return this.catalog.searchProducts({
          q: this.requiredString(enriched, 'query'),
          page: 1,
          pageSize: 10,
          ...(typeof enriched.priceMinMinor === 'number'
            ? { priceMinMinor: enriched.priceMinMinor }
            : {}),
          ...(typeof enriched.priceMaxMinor === 'number'
            ? { priceMaxMinor: enriched.priceMaxMinor }
            : {}),
          ...(typeof enriched.sort === 'string'
            ? {
                sort: enriched.sort as 'newest' | 'price_asc' | 'price_desc',
              }
            : {}),
        });
      }
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
      case 'recommendProducts': {
        const enriched = enrichSearchToolArgs(args, userMessages);
        return this.catalog.searchProducts({
          q: this.optionalString(enriched, 'query'),
          page: 1,
          pageSize: this.positiveInteger(enriched, 'limit', 5),
          ...(typeof enriched.priceMinMinor === 'number'
            ? { priceMinMinor: enriched.priceMinMinor }
            : {}),
          ...(typeof enriched.priceMaxMinor === 'number'
            ? { priceMaxMinor: enriched.priceMaxMinor }
            : {}),
          ...(typeof enriched.sort === 'string'
            ? {
                sort: enriched.sort as 'newest' | 'price_asc' | 'price_desc',
              }
            : {}),
        });
      }
      case 'compareProducts': {
        const ids = args.productIds;
        if (!Array.isArray(ids) || ids.length < 2) {
          throw new BadRequestException({
            code: 'INVALID_COMPARE',
            message: 'productIds must be an array of at least 2 ids',
          });
        }
        return this.catalog.compareProducts(
          ids.filter((id): id is string => typeof id === 'string'),
        );
      }
      case 'getOffers': {
        const product = (await this.catalog.getProduct(
          this.optionalString(args, 'productId') ??
            this.requiredString(args, 'slug'),
        )) as {
          variants?: {
            sku?: { offers?: { id: string; listPriceMinor: number; currency: string; active: boolean }[] };
          }[];
          provenance?: unknown;
        };
        const offers =
          product.variants?.flatMap((v) => v.sku?.offers ?? []) ?? [];
        return { offers, authoritative: true, catalog: 'admin_managed' };
      }
      case 'getPriceHistory': {
        const product = (await this.catalog.getProduct(
          this.optionalString(args, 'productId') ??
            this.requiredString(args, 'slug'),
        )) as { id: string };
        return this.catalog.getPriceHistory(
          product.id,
          this.positiveInteger(args, 'limit', 20),
        );
      }
      case 'getAvailability': {
        const product = (await this.catalog.getProduct(
          this.optionalString(args, 'productId') ??
            this.requiredString(args, 'slug'),
        )) as { id: string };
        return this.catalog.getAvailability(product.id);
      }
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

  private wrapStreamForPersistence(
    upstream: Response,
    conversationId: string,
  ): Response {
    if (!upstream.body) {
      return upstream;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';
    let products: readonly Record<string, unknown>[] | undefined;
    let citations: unknown;
    let hadError = false;

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform: (chunk, controller) => {
        controller.enqueue(chunk);
        buffer += decoder.decode(chunk, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          for (const line of frame.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) {
              continue;
            }
            const json = trimmed.slice(5).trim();
            if (!json) {
              continue;
            }
            try {
              const event = JSON.parse(json) as Record<string, unknown>;
              if (event.type === 'delta' && typeof event.text === 'string') {
                accumulated += event.text;
              } else if (event.type === 'error') {
                hadError = true;
              } else if (event.type === 'done') {
                if (Array.isArray(event.products)) {
                  products = event.products.filter(
                    (item): item is Record<string, unknown> =>
                      !!item && typeof item === 'object',
                  );
                }
                if (event.citations !== undefined) {
                  citations = event.citations;
                }
              }
            } catch {
              // ignore malformed frames while proxying
            }
          }
        }
      },
      flush: () => {
        if (!hadError && accumulated.trim()) {
          void this.persistAssistantMessage(conversationId, accumulated, {
            ...(citations !== undefined ? { citationsJson: citations } : {}),
            ...(products && products.length > 0 ? { products } : {}),
          }).catch(() => {
            // persistence must not break an already-delivered stream
          });
        }
      },
    });

    return new Response(upstream.body.pipeThrough(transform), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  }

  private async loadConversationModelMessages(
    conversationId: string,
    userId: string,
  ): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
    const prisma = this.prisma();
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw new ForbiddenException('Conversation not found');
    }
    const rows = await prisma.conversationMessage.findMany({
      where: {
        conversationId,
        role: { in: ['user', 'assistant'] },
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_HISTORY_MESSAGES,
      select: { role: true, content: true },
    });
    return rows
      .filter(
        (row): row is { role: 'user' | 'assistant'; content: string } =>
          (row.role === 'user' || row.role === 'assistant') &&
          typeof row.content === 'string',
      )
      .map((row) => ({ role: row.role, content: row.content }));
  }

  private async loadConversationUserMessages(
    conversationId: string,
    userId: string,
  ): Promise<string[]> {
    const prisma = this.prisma();
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      return [];
    }
    const rows = await prisma.conversationMessage.findMany({
      where: { conversationId, role: 'user' },
      orderBy: { createdAt: 'asc' },
      take: MAX_HISTORY_MESSAGES,
      select: { content: true },
    });
    return rows.map((row) => row.content);
  }

  private readStoredProducts(
    citationsJson: unknown,
  ): readonly Record<string, unknown>[] | undefined {
    if (!citationsJson || typeof citationsJson !== 'object') {
      return undefined;
    }
    const record = citationsJson as Record<string, unknown>;
    if (!Array.isArray(record.products)) {
      return undefined;
    }
    return record.products.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === 'object',
    );
  }

  private readProducts(value: unknown): readonly Record<string, unknown>[] | undefined {
    const record = this.asRecord(value);
    if (!Array.isArray(record.products)) {
      return undefined;
    }
    return record.products.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === 'object',
    );
  }

  private readCitations(value: unknown): unknown {
    return this.asRecord(value).citations;
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
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
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
