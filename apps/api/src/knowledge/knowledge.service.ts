import { randomUUID } from 'node:crypto';

import {
  chunkText,
  contentHash,
  DeterministicModelProvider,
} from '@buying-bot/ai-core';
import type { PrismaClient, PrismaDatabaseClient } from '@buying-bot/database';
import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';

import { issueServiceJwt } from '../auth/service-jwt.js';
import type { ApiEnv } from '../config/env.js';
import { APP_ENV, DATABASE_CLIENT } from '../config/tokens.js';
import type {
  IngestKnowledgeBody,
  ListKnowledgeQuery,
} from './knowledge.schemas.js';

@Injectable()
export class KnowledgeService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly database: PrismaDatabaseClient | null,
    @Inject(APP_ENV) private readonly env: ApiEnv,
  ) {}

  async ingest(body: IngestKnowledgeBody): Promise<unknown> {
    return this.prisma().$transaction(async (tx) => {
      const document = await tx.knowledgeDocument.create({
        data: {
          title: body.title,
          sourceType: body.sourceType,
          checksum: contentHash(body.content),
          metadata: this.jsonObject(body.metadata),
          status: 'PENDING',
        },
      });
      await tx.outboxMessage.create({
        data: {
          type: 'knowledge.ingest',
          payloadJson: {
            documentId: document.id,
            content: body.content,
          },
        },
      });
      return document;
    });
  }

  async listDocuments(query: ListKnowledgeQuery): Promise<{
    readonly items: unknown[];
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
  }> {
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma().knowledgeDocument.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { _count: { select: { chunks: true } } },
      }),
      this.prisma().knowledgeDocument.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async processIngestDocument(
    documentId: string,
    content: string,
  ): Promise<void> {
    const prisma = this.prisma();
    await prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    try {
      await prisma.knowledgeChunk.deleteMany({ where: { documentId } });
      for (const part of chunkText(content)) {
        const chunk = await prisma.knowledgeChunk.create({
          data: {
            documentId,
            ordinal: part.ordinal,
            content: part.content,
            contentHash: contentHash(part.content),
          },
        });
        const embedded = await this.embed(part.content);
        const vector = `[${embedded.embedding
          .map((value) => String(value))
          .join(',')}]`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO ai.embeddings
            (id, chunk_id, model, dims, embedding)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5::vector)`,
          randomUUID(),
          chunk.id,
          embedded.model,
          embedded.embedding.length,
          vector,
        );
      }
      await prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: 'READY' },
      });
    } catch (error: unknown) {
      await prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  private async embed(content: string): Promise<{
    readonly model: string;
    readonly embedding: readonly number[];
  }> {
    if (
      process.env.AI_PROVIDER === 'deterministic' ||
      this.env.NODE_ENV === 'test'
    ) {
      const result = await new DeterministicModelProvider(1536).embed({
        model: 'deterministic-embedding-v1',
        input: content,
      });
      return { model: result.model, embedding: result.embedding };
    }

    const token = await issueServiceJwt({
      secret: this.env.SERVICE_JWT_SECRET,
      serviceName: 'api',
      audience: 'ai-service',
    });
    const response = await fetch(
      `${this.env.AI_SERVICE_BASE_URL ?? 'http://127.0.0.1:3003'}/v1/embed`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ input: content }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok) {
      throw new BadGatewayException('Embedding provider unavailable');
    }
    const value: unknown = await response.json();
    if (typeof value !== 'object' || value === null) {
      throw new BadGatewayException('Invalid embedding response');
    }
    const record = value as Record<string, unknown>;
    if (
      typeof record.model !== 'string' ||
      !Array.isArray(record.embedding) ||
      !record.embedding.every((item) => typeof item === 'number')
    ) {
      throw new BadGatewayException('Invalid embedding response');
    }
    return { model: record.model, embedding: record.embedding };
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

  private jsonObject(value: Record<string, unknown>): object {
    return JSON.parse(JSON.stringify(value)) as object;
  }
}
