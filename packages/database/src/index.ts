/**
 * Database ports for future Prisma/PostgreSQL adapters.
 * Cache (Redis) is never the system of record for critical business data.
 */

export interface DatabaseHealth {
  readonly ok: boolean;
  readonly latencyMs?: number;
  readonly message?: string;
}

export interface UnitOfWork {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface DatabaseClient {
  healthCheck(): Promise<DatabaseHealth>;
  withTransaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T>;
  disconnect(): Promise<void>;
}

/**
 * Marker interface for repositories. Concrete repos belong near domain modules.
 */
export interface Repository<TEntity, TId extends string = string> {
  findById(id: TId): Promise<TEntity | null>;
}
