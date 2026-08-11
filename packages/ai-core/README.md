# `@buying-bot/ai-core`

## Responsibility

Provide **shared AI primitives**—prompt/tool types, model message shapes, and reusable AI helpers—without owning the deployable AI service orchestration.

## In scope (when implemented)

- Shared prompt/tool interfaces and schemas
- Model message and embedding-related types
- Reusable pure helpers for AI pipelines used by `apps/ai` and callers

## Out of scope

- Long-running AI service process / HTTP server (belongs in `apps/ai`)
- Vendor API keys or secrets
- End-user chat UI (compose in apps with `@buying-bot/ui`)

## Consumers (intended)

`apps/ai`, `apps/api`, `apps/worker` (and SDK consumers if exposing AI features)

## Status

Package folder only — no AI implementation yet.
