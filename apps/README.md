# Applications

Deployable packages under `apps/*`. Dependency rule: **apps may depend on packages; apps must not import other apps.**

| App          | Role                                            | Status (M1–M5 track)   |
| ------------ | ----------------------------------------------- | ---------------------- |
| `api`        | NestJS + Fastify product HTTP API (ADR-0005)    | Foundation → AuthN/Z   |
| `worker`     | Async jobs / BullMQ consumers (ops shell today) | Ops bootstrap          |
| `ai-service` | Model orchestration process                     | Ops bootstrap          |
| `web`        | Customer Next.js storefront (ADR-0007)          | M13 App Router (:3001) |
| `admin`      | Admin Next.js portal                            | M14 App Router (:3004) |
| `docs`       | Documentation site shell                        | Placeholder            |

See [docs/developer/getting-started.md](../docs/developer/getting-started.md) and [docs/DOCUMENTATION_BASELINE.md](../docs/DOCUMENTATION_BASELINE.md).
