# `@buying-bot/ai-core`

## Responsibility

Provide **shared AI primitives**—prompt/tool types, model message shapes, and reusable AI helpers—without owning the deployable AI service orchestration.

## In scope

- Shared prompt/tool interfaces and schemas
- Model message and embedding-related types
- Provider ports (`ModelProvider`) for swappable vendors
- Tool risk levels and human-approval flags

## Out of scope

- Long-running AI service process / HTTP server (belongs in `apps/ai-service`)
- Vendor API keys or secrets
- End-user chat UI (compose in apps with `@buying-bot/ui`)

## Consumers (intended)

`apps/ai-service`, `apps/api`, `apps/worker` (and SDK consumers if exposing AI features)

## Status

Provider/tool contracts implemented. No vendor adapters yet.
