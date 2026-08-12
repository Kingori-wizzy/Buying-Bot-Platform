# `@buying-bot/database`

## Responsibility

Centralize **persistence abstractions and shared data-access utilities** so services do not each invent incompatible database clients or migration patterns.

## In scope (when implemented)

- Shared client/factory patterns for approved data stores
- Common transaction helpers and repository base utilities
- Migration tooling conventions shared by backend services

## Out of scope

- Business repositories that encode product workflows (prefer app modules or domain packages)
- Schema documentation volumes (see `docs/Database/`)
- Direct UI or browser usage

## Consumers (intended)

`apps/api`, `apps/worker`, optionally `apps/ai-service`

## Status

Ports implemented (`DatabaseClient`, health, transactions). No Prisma/PostgreSQL adapter yet.
