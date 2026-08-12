# ADR-0004: Node.js HTTP ops bootstrap (interim)

- Status: Accepted
- Date: 2026-08-12
- Deciders: Platform Architecture
- Aligns with: [docs/ARCHITECTURE.md](../ARCHITECTURE.md)

## Context

Production readiness requires liveness/readiness/health endpoints, structured logging, typed configuration, and graceful shutdown before application frameworks (NestJS, Fastify, Next.js, etc.) are selected.

Selecting a full HTTP framework now would prematurely lock the stack and violate the “framework via ADR when scaffolding for real” principle.

## Decision

Until a service-framework ADR is accepted:

1. Node deployables (`api`, `worker`, `ai-service`) expose ops endpoints via Node’s built-in `node:http` through `@buying-bot/utils` (`createOpsServer`).
2. Shared packages provide typed env loading (`@buying-bot/config`), structured logging, correlation IDs, and shutdown helpers.
3. Product HTTP routing, OpenAPI, auth middleware, and UI frameworks remain deferred.

## Consequences

- Ops/reliability foundations are verifiable now (health, logs, config fail-fast, Docker healthchecks).
- Framework ADRs can replace the ops server adapter without rewriting domain packages.
- Contributors must not grow business routes on the interim ops server; domain APIs wait for the framework ADR.

## Alternatives considered

| Option                         | Why not now                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| NestJS / Fastify immediately   | Premature stack lock-in                                      |
| No HTTP until framework chosen | Blocks health/readiness verification and container readiness |
| Separate “ops-sidecar” process | Unnecessary operational complexity at this stage             |
