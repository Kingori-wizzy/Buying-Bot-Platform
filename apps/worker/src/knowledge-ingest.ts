import { randomUUID } from 'node:crypto';

import {
  chunkText,
  contentHash,
  DeterministicModelProvider,
} from '@buying-bot/ai-core';
import type { PrismaClient } from '@buying-bot/database';
import { SignJWT } from 'jose';

/**
 * Worker-side knowledge ingest: chunk → embed → pgvector insert.
 * Uses DeterministicModelProvider when AI_PROVIDER=deterministic / test;
 * otherwise calls ai-service /v1/embed (never connects to PG for model calls — embeddings via HTTP).
 * Note: worker DOES use Prisma for knowledge tables (ingestion is not the AI service).
 */
export async function processKnowledgeIngest(options: {
  readonly prisma: PrismaClient;
  readonly documentId: string;
  readonly content: string;
  readonly aiServiceBaseUrl?: string | undefined;
  readonly serviceJwtSecret?: string | undefined;
  readonly aiProvider: string;
}): Promise<void> {
  const { prisma, documentId, content } = options;
  const aiServiceBaseUrl = options.aiServiceBaseUrl;
  await prisma.knowledgeDocument.update({
    where: { id: documentId },
    data: { status: 'PROCESSING' },
  });

  try {
    await prisma.knowledgeChunk.deleteMany({ where: { documentId } });
    const useDeterministic =
      options.aiProvider === 'deterministic' ||
      process.env.NODE_ENV === 'test' ||
      !aiServiceBaseUrl;

    const provider = useDeterministic
      ? new DeterministicModelProvider(1536)
      : null;

    for (const part of chunkText(content)) {
      const chunk = await prisma.knowledgeChunk.create({
        data: {
          documentId,
          ordinal: part.ordinal,
          content: part.content,
          contentHash: contentHash(part.content),
        },
      });

      let embedding: readonly number[];
      let model: string;
      if (provider) {
        const result = await provider.embed({
          model: 'deterministic-embed-v1',
          input: part.content,
        });
        embedding = result.embedding;
        model = result.model;
      } else {
        if (!aiServiceBaseUrl) {
          throw new Error(
            'AI service base URL is required for remote embeddings',
          );
        }
        const token = await issueJwt(options.serviceJwtSecret ?? '');
        const response = await fetch(
          `${aiServiceBaseUrl.replace(/\/$/, '')}/v1/embed`,
          {
            method: 'POST',
            headers: {
              authorization: `Bearer ${token}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({ input: part.content }),
          },
        );
        if (!response.ok) {
          throw new Error(`embed failed: HTTP ${String(response.status)}`);
        }
        const body = (await response.json()) as {
          embedding: number[];
          model: string;
        };
        embedding = body.embedding;
        model = body.model;
      }

      const vectorLiteral = `[${embedding.join(',')}]`;
      const id = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO ai.embeddings (id, chunk_id, model, dims, embedding, created_at)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5::vector, NOW())`,
        id,
        chunk.id,
        model,
        embedding.length,
        vectorLiteral,
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

async function issueJwt(secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('worker')
    .setAudience('ai-service')
    .setIssuer('buying-bot-platform')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}
