# `@buying-bot/sdk`

## Responsibility

Expose a **typed client SDK** for calling platform APIs from web, admin, workers, and future mobile clients—keeping transport and contract usage consistent.

## In scope (when implemented)

- Generated or hand-maintained API clients aligned with `@buying-bot/types`
- Auth header/session attachment helpers (using `@buying-bot/auth` contracts)
- Request idempotency / error normalization helpers for consumers

## Out of scope

- Server route handlers (belong in `apps/api`)
- UI rendering (see `@buying-bot/ui`)
- Direct database access (see `@buying-bot/database`)

## Consumers (intended)

`apps/web`, `apps/admin`, `apps/worker`, future `apps/mobile`

## Status

Minimal `PlatformSdk` with health client and typed errors. Product endpoints deferred.
