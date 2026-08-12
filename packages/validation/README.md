# `@buying-bot/validation`

## Responsibility

Own **runtime validation schemas and validators** for inputs crossing trust boundaries (HTTP, jobs, AI tool args), aligned with shared types.

## In scope

- Shared Zod schemas and helpers
- Reusable validators for common fields
- `parseOrThrow` for fail-fast boundary parsing

## Out of scope

- Pure TypeScript types without runtime checks (see `@buying-bot/types`)
- UI form components (see `@buying-bot/ui`)
- Persistence constraints exclusive to SQL (see `@buying-bot/database` / DB docs)

## Consumers (intended)

`apps/api`, `apps/worker`, `apps/ai-service`, and clients that validate before submit

## Status

Foundation implemented with Zod schemas and `parseOrThrow`.
