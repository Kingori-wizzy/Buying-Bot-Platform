# `@buying-bot/validation`

## Responsibility

Own **runtime validation schemas and validators** for inputs crossing trust boundaries (HTTP, jobs, AI tool args), aligned with shared types.

## In scope (when implemented)

- Shared schema definitions (e.g. Zod/Valibot or chosen library — via future ADR)
- Reusable validators for common fields (email, money, IDs)
- Helpers to bridge validation results to API error shapes

## Out of scope

- Pure TypeScript types without runtime checks (see `@buying-bot/types`)
- UI form components (see `@buying-bot/ui`)
- Persistence constraints exclusive to SQL (see `@buying-bot/database` / DB docs)

## Consumers (intended)

`apps/api`, `apps/worker`, `apps/ai`, and clients that validate before submit

## Status

Package folder only — no validation implementation yet.
