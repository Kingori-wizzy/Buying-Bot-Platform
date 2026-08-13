# `@buying-bot/database`

## Responsibility

Centralize **persistence abstractions and shared data-access utilities** so services do not each invent incompatible database clients or migration patterns.

## In scope

- `DatabaseClient` / `UnitOfWork` / health ports
- Prisma PostgreSQL adapter (`PrismaDatabaseClient`, `createPrismaClient`)
- Identity schema migrations under `prisma/migrations`
- Idempotent RBAC seed (`seedIdentityCatalog`)

## Out of scope

- Business repositories that encode product workflows (prefer app modules)
- Exporting Prisma models as the public domain API
- Redis as system of record

## Scripts

| Script                 | Purpose                         |
| ---------------------- | ------------------------------- |
| `pnpm prisma:generate` | Generate Prisma Client          |
| `pnpm prisma:migrate`  | `prisma migrate deploy`         |
| `pnpm build`           | Compile TypeScript → `dist/`    |
| `pnpm test`            | Unit + optional DB health tests |

## Service identity note (M5)

Service-to-service authentication uses short-lived HS256 JWTs
(`SERVICE_JWT_SECRET`). No `ServiceIdentity` table is required for M5.

## Consumers

`apps/api`, `apps/worker`, optionally `apps/ai-service`

## Status

Prisma identity schema + adapter implemented (M3).
