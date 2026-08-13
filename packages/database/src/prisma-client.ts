import { PrismaClient } from '@prisma/client';

import type { DatabaseClient, DatabaseHealth, UnitOfWork } from './ports.js';

export type { PrismaClient };

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient(
    databaseUrl
      ? {
          datasources: {
            db: { url: databaseUrl },
          },
        }
      : undefined,
  );
}

export async function disconnectPrisma(client: PrismaClient): Promise<void> {
  await client.$disconnect();
}

class PrismaUnitOfWork implements UnitOfWork {
  #committed = false;
  #rolledBack = false;

  commit(): Promise<void> {
    if (this.#rolledBack) {
      return Promise.reject(new Error('Unit of work already rolled back'));
    }
    this.#committed = true;
    return Promise.resolve();
  }

  rollback(): Promise<void> {
    if (this.#committed) {
      return Promise.reject(new Error('Unit of work already committed'));
    }
    this.#rolledBack = true;
    return Promise.resolve();
  }

  get wasRolledBack(): boolean {
    return this.#rolledBack;
  }
}

/**
 * Prisma adapter implementing the DatabaseClient port.
 * Exposes the underlying PrismaClient for identity repositories in apps/api
 * without exporting Prisma models as the package's public domain API.
 */
export class PrismaDatabaseClient implements DatabaseClient {
  readonly prisma: PrismaClient;

  constructor(client: PrismaClient) {
    this.prisma = client;
  }

  async healthCheck(): Promise<DatabaseHealth> {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, latencyMs: Date.now() - started };
    } catch (error: unknown) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        message: error instanceof Error ? error.message : 'database unhealthy',
      };
    }
  }

  async withTransaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async () => {
      const uow = new PrismaUnitOfWork();
      const result = await work(uow);
      if (uow.wasRolledBack) {
        throw new Error('Transaction rolled back');
      }
      await uow.commit();
      return result;
    });
  }

  async disconnect(): Promise<void> {
    await disconnectPrisma(this.prisma);
  }
}
