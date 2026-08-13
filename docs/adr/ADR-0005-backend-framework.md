# ADR-0005: Backend HTTP framework for `apps/api`

- Status: **Accepted**
- Date: 2026-08-12
- Deciders: Platform Architecture; accepted by technical lead on 2026-08-12
- Aligns with: [docs/ARCHITECTURE.md](../ARCHITECTURE.md), [ADR-0001](./0001-pnpm-turborepo-monorepo.md), [ADR-0002](./0002-typescript-strict-shared-config.md), [ADR-0004](./0004-node-http-ops-bootstrap.md)
- Scope: Product HTTP framework for **`apps/api` only**
- Out of scope: Installing packages, scaffolding Nest, AuthN/Z product code, PostgreSQL/Prisma, Next.js, changing `apps/worker` or `apps/ai-service`

## 1. Context

The Buying Bot Platform is an AI-powered omnichannel commerce system. The
Enterprise Architecture Document locks a **modular monolith first**: one
monorepo, independently deployable apps, shared packages, and future
microservice extraction without starting as a distributed system.

Current backend reality (verified in-repo, not aspirational):

| Asset                    | Current state                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `apps/api`               | Node ops shell (ADR-0004). Health/live/ready, typed env, JSON logs, graceful shutdown. **No product routes.** |
| `apps/worker`            | Separate deployable. Ops shell only. Queue consumers deferred.                                                |
| `apps/ai-service`        | Separate deployable. Model orchestration process. Ports live in `@buying-bot/ai-core`.                        |
| `@buying-bot/auth`       | `Authenticator` / `Authorizer` / `AuthPrincipal` / RBAC vocabulary. No IdP.                                   |
| `@buying-bot/validation` | Zod + `parseOrThrow`.                                                                                         |
| `@buying-bot/database`   | `DatabaseClient` / `UnitOfWork` ports. No Prisma.                                                             |
| `@buying-bot/utils`      | `createOpsServer` on `node:http`. ADR-0004 forbids growing business routes here.                              |
| `@buying-bot/sdk`        | Typed client with health + `PlatformApiError`.                                                                |

ADR-0004 explicitly deferred NestJS/Fastify until this ADR. Contributors must
not add domain HTTP on the interim ops server.

Planned domains that will live behind `apps/api` (not implemented): Identity,
Customers, Catalog, Inventory, Cart, Orders, Payments, Notifications,
Conversations, Support, AI orchestration edge, Analytics, Marketing,
Integrations, Administration.

External edges that will hit `apps/api` (or be queued from it): WhatsApp,
Instagram, TikTok, Email, SMS, M-Pesa, Stripe, PayPal, logistics webhooks.

## 2. Problem

`apps/api` needs a product HTTP framework before domain modules can be
introduced without inventing ad-hoc routing, DI, auth guards, OpenAPI, and
error mapping on `node:http`.

The wrong choice would either:

- lock the platform to a slow, middleware-heavy stack that fights Fastify-class
  webhook/AI ingress; or
- leave a small team to invent Nest-equivalent module/DI/guard conventions
  while 14+ domains, RBAC, payments, and omnichannel adapters land.

This ADR selects the HTTP application framework for `apps/api`. It does **not**
authorize implementation.

## 3. Architectural requirements

Must support, in this repository’s topology:

1. **Modular monolith** — Nest/Fastify modules (or equivalent) map to DDD
   bounded contexts inside `apps/api`, not to new deployables.
2. **Clean Architecture** — HTTP adapters depend on ports in `packages/*`;
   domain logic must not import Nest/Fastify types.
3. **DDD boundaries** — Catalog must not import Payments internals; share via
   application services or domain events.
4. **Dependency injection** — Swap `Authenticator`, `DatabaseClient`,
   `ModelProvider` adapters without rewriting controllers.
5. **AuthN / AuthZ / RBAC** — Server-side enforcement using
   `@buying-bot/auth`. UI hiding is never sufficient (`apps/admin`).
6. **Validation** — Zod from `@buying-bot/validation`, not a second schema
   stack.
7. **API versioning + OpenAPI** — `/v1` (and later `/v2`) with generated docs
   consumed by `@buying-bot/sdk`.
8. **Workers stay separate** — BullMQ consumers belong in `apps/worker`, not
   in the API process. API may **enqueue** jobs.
9. **Events** — In-process domain events now; extract to a broker later
   without rewriting domains.
10. **AI** — API calls `apps/ai-service` over HTTP via SDK/ports. High-risk
    tools (`payment` / `admin`) require authorization + human approval flags
    already defined in `@buying-bot/ai-core`.
11. **Payments / omnichannel** — Signed webhooks, raw body, idempotency keys,
    adapter isolation. Provider SDKs must not leak into domain modules.
12. **Observability** — Preserve ADR-0004 JSON logs, request/correlation IDs,
    liveness vs readiness. OpenTelemetry later.
13. **Testing** — Strict TypeScript, Vitest, HTTP contract tests without a
    live database.
14. **Performance / scale** — Stateless API, horizontal replicas, Redis as
    cache/queue only (never source of truth).
15. **Extraction** — A Nest/Fastify module should be movable to a new app
    later without rewriting domain packages.
16. **Team scale** — Conventions that survive more than one contributor
    (CODEOWNERS is currently a single owner).

## 4. Options considered

| ID  | Option                       | What it would mean here                                                                                             |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| A   | **NestJS + Fastify adapter** | Nest application framework (`@nestjs/core`) with `@nestjs/platform-fastify` as the HTTP server for `apps/api`.      |
| B   | **NestJS + Express adapter** | Same Nest programming model with `@nestjs/platform-express` (Nest default).                                         |
| C   | **Fastify standalone**       | Fastify + plugins (`@fastify/sensible`, `@fastify/swagger`, custom DI such as Awilix) as the application framework. |

Not in scope for this comparison: Koa, Hono, tRPC, GraphQL-first, or remaining
on `node:http`.

## 5. Detailed comparison

Scoring is relative to Buying Bot Platform (higher is better). 1 = poor fit,
5 = strong fit.

| Requirement                                                 | A Nest + Fastify | B Nest + Express | C Fastify standalone |
| ----------------------------------------------------------- | ---------------: | ---------------: | -------------------: |
| Modular monolith / Nest-style modules as bounded contexts   |                5 |                5 |                    2 |
| DDD + Clean Architecture (ports in `packages/*`)            |                5 |                5 |                    3 |
| First-class DI matching `Authenticator` / `DatabaseClient`  |                5 |                5 |                    2 |
| AuthN/AuthZ/RBAC guards on every route                      |                5 |                5 |                    3 |
| Zod validation (`@buying-bot/validation`)                   |                4 |                4 |                    5 |
| API versioning                                              |                5 |                5 |                    3 |
| OpenAPI → future SDK generation                             |                5 |                5 |                    4 |
| Keep `apps/worker` separate; API only enqueues              |                4 |                4 |                    4 |
| In-process events, later broker                             |                5 |                5 |                    3 |
| Call `apps/ai-service` without coupling AI into API modules |                5 |                5 |                    4 |
| Payment/omnichannel webhooks (raw body, idempotency)        |                4 |                4 |                    5 |
| Observability (replace `createOpsServer`, keep contracts)   |                4 |                4 |                    4 |
| Testing (Vitest + HTTP)                                     |                4 |                4 |                    4 |
| Runtime performance (webhooks, AI proxy, fan-in)            |                5 |                3 |                    5 |
| Horizontal scale / statelessness                            |                5 |                5 |                    5 |
| Maintainability as domains grow                             |                5 |                5 |                    2 |
| Developer experience for this monorepo                      |                4 |                4 |                    3 |
| Future module → microservice extraction                     |                5 |                5 |                    3 |
| Team scalability / convention over invention                |                5 |                5 |                    2 |
| **Weighted fit (unweighted sum)**                           |           **89** |           **85** |               **71** |

Notes on close scores:

- A vs B differs mainly on **HTTP performance** and **Express-only middleware
  gravity**. Nest’s module/DI/guard model is identical.
- C wins on raw HTTP and Zod-native JSON Schema, and loses on DI, module
  enforcement, versioning, and team convention — the expensive parts of this
  platform.

## 6. Advantages

### Option A — NestJS + Fastify adapter

- Nest **modules** map 1:1 onto planned bounded contexts (`CatalogModule`,
  `OrdersModule`, `PaymentsModule`, `IntegrationsModule`) inside one
  deployable — the modular monolith the EAD requires.
- Nest **providers / tokens** implement existing ports without putting Nest
  types into `@buying-bot/auth` or `@buying-bot/database`.
- **Guards** are the correct place to call `Authorizer.isAllowed` so admin UI
  cannot become the authorization layer.
- Built-in **URI versioning** (`/v1/...`) matches API-first + SDK evolution.
- `@nestjs/swagger` can document versioned routes for `@buying-bot/sdk`.
- Fastify under Nest keeps webhook and AI-proxy latency closer to option C
  than Express would.
- `@nestjs/event-emitter` covers in-process domain events; a later broker
  adapter can replace the emitter without moving domain code.
- A Nest module can later become `apps/<service>` while packages stay put —
  the extraction path the EAD describes.
- Worker remains `apps/worker`: API uses a queue **port**, not
  `@Processor()` in the API process.

### Option B — NestJS + Express adapter

- Same module/DI/guard/OpenAPI/versioning benefits as A.
- Slightly larger off-the-shelf middleware catalog (Passport strategies,
  some webhook helpers historically Express-first).
- Nest docs and examples default to Express, which can reduce copy-paste
  friction.

### Option C — Fastify standalone

- Fastest HTTP path; native JSON Schema; excellent raw-body and plugin hooks
  for Stripe/M-Pesa/WhatsApp signatures.
- Smallest framework surface; easiest to reason about a single `app.ts`.
- Zod Type Provider aligns naturally with `@buying-bot/validation`.
- No Nest decorator/runtime magic — friendlier to `verbatimModuleSyntax`
  and ESM as already used by workspace packages.

## 7. Disadvantages

### Option A

- Nest + Fastify is not the Nest default; some middleware (certain Passport
  strategies, some raw-body recipes) need Fastify-specific wiring.
- Stripe/M-Pesa signature verification **must** enable Fastify raw body
  (`rawBody: true` / content-type parser). This is an implementation
  constraint, not a reason to choose Express.
- Nest’s common tutorials push `class-validator`. That would **fork**
  validation away from `@buying-bot/validation` and is rejected below.
- Nest historically CJS-leaning; this repo is `"type": "module"` + Node 22.
  Implementation must pin a Nest major with ESM support and verify `tsc`
  `NodeNext` builds. **Not verified in this ADR.**
- Risk that developers put domain logic in controllers/services annotated
  with Nest, leaking framework types into packages. Coding standards must
  forbid Nest imports in `packages/*`.

### Option B

- Express is the slower Nest HTTP adapter. The API will terminate
  omnichannel webhooks, payment callbacks, and AI-service proxy traffic —
  latency and concurrency matter more than a typical CRUD admin API.
- Express middleware culture encourages `req.user` mutation and global
  middleware stacks that bypass Nest guards — a real AuthZ footgun.
- Choosing Express “because Nest defaults to it” is stack inertia, not a
  platform requirement. No current package in this repo needs Express.

### Option C

- No first-class DI. Awilix/TSyringe would be a **second** architectural
  product the team must design, document, and enforce — while also designing
  commerce domains.
- Module boundaries become folder conventions. With 14+ domains, payments,
  and integrations, that drifts. Nest modules fail the build if a domain is
  wired incorrectly; Fastify plugins do not encode DDD.
- API versioning, RBAC guards, and interceptor-style error mapping would be
  handwritten. That duplicates what Nest already provides and what
  `@buying-bot/types` `ApiErrorBody` already specifies.
- Team scalability is the weakest: a second engineer has no framework-level
  map of “where a bounded context lives.”
- Extraction to microservices later would extract Fastify plugins plus a
  custom DI graph, not a Nest module with a clear public facade.

## 8. Operational implications

| Concern                            | A Nest + Fastify                                                                                | B Nest + Express | C Fastify                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------- |
| Replace ADR-0004 `createOpsServer` | Nest Terminus or Fastify routes calling existing `aggregateHealth` / `processHealthCheck`       | Same             | Fastify routes wrapping the same helpers     |
| Graceful shutdown                  | Nest `enableShutdownHooks` + existing `installGracefulShutdown` pattern                         | Same             | Fastify `onClose`                            |
| Docker / non-root / healthcheck    | Unchanged image contract (`/health/live`)                                                       | Unchanged        | Unchanged                                    |
| Process split                      | API ≠ worker ≠ AI service (EAD)                                                                 | Same             | Same                                         |
| Redis                              | Cache + BullMQ **producer** in API; **consumer** in `apps/worker`                               | Same             | Same                                         |
| Config                             | Keep `@buying-bot/config` fail-fast; Nest `ConfigModule` must not introduce a second env parser | Same             | Fastify env plugin must not fork env schemas |

Operational rule for all options: **do not run BullMQ processors inside
`apps/api`**. That would collapse the worker deployable the EAD already
separated for independent scale and failure isolation.

## 9. Security implications

Buying Bot Platform will handle commerce, personal data, payments, and AI
tool calls. Framework choice affects _where_ controls live, not whether they
exist.

| Control                      | A / B (Nest)                                                                                     | C (Fastify)                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| AuthN                        | Guard wrapping `Authenticator.authenticate`                                                      | `preHandler` wrapping the same port                        |
| AuthZ / RBAC                 | Guard wrapping `Authorizer.isAllowed` per route metadata                                         | Manual hook; easy to forget on a new route                 |
| Admin vs public API          | Nest modules + distinct guard sets                                                               | Plugin encapsulation; weaker default                       |
| Webhook authenticity         | Fastify raw body (A) or Express raw body (B) + adapter                                           | Fastify raw body (strong)                                  |
| Validation / mass assignment | Zod DTOs at the HTTP edge                                                                        | Fastify schema (strong)                                    |
| Error leakage                | Nest exception filter mapping to `ApiErrorBody`; no stacks in production (already in ops server) | Custom error handler; must reimplement                     |
| AI tool abuse                | Guard + `AiToolDefinition.requiresHumanApproval` before any write/payment tool                   | Same ports; easier to call tools from a route accidentally |
| Rate limiting                | Nest guard + later Redis store                                                                   | Fastify rate-limit plugin                                  |

Nest does **not** implement AuthN/Z by itself. This ADR does not authorize
Passport, JWT libraries, or session stores. It only requires that the chosen
framework can host the existing ports.

**Option A is preferred for security process**: forgotten AuthZ is a
framework miss (no guard metadata), not a missing `preHandler` on one of
dozens of omnichannel routes.

## 10. Performance implications

Expected API hot paths (future, not measured):

- Payment and channel webhooks (burst, must ack fast, then enqueue)
- AI assistant round-trips (API → `apps/ai-service` → model provider)
- Catalog search/read (cacheable; Redis later)
- Admin RBAC-heavy reads

| Option | Implication for those paths                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| A      | Fastify I/O + Nest overhead (DI, guards, interceptors). Overhead is CPU-cheap relative to model/DB/network. Acceptable. |
| B      | Express adapter adds unnecessary HTTP overhead on webhook/AI fan-in with **no** compensating platform need.             |
| C      | Fastest HTTP. Gains are real but smaller than queue offload, caching, and not blocking webhooks on AI/provider I/O.     |

Performance rule (all options): webhooks must acknowledge and enqueue;
reconciliation and AI work belong in `apps/worker` / `apps/ai-service`.

No load test has been run. Claims above are architectural, **not**
benchmarked on this repo. **NOT VERIFIED** as numbers.

## 11. Testing implications

Current tests: Vitest on packages + HTTP smoke tests against ADR-0004 ops
endpoints.

| Option | How `apps/api` should be tested                                                                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A / B  | Nest testing module: mock `Authenticator`, `DatabaseClient`, queue port; `supertest` or Fastify inject against the Nest app. Domain unit tests stay in packages with **zero** Nest imports. |
| C      | Fastify `app.inject()`. Same mock ports. Team must invent module test harnesses.                                                                                                            |

All options must keep `packages/*` unit-testable without booting HTTP.

Zod at the boundary is already testable (`parseOrThrow`). Nest must use a
Zod pipe so tests do not require `class-validator` metadata.

## 12. Long-term scalability

**Runtime:** All three options are stateless Node processes and can sit
behind the same Docker/K8s later. Scale-out is not the differentiator.

**Domain scale:** Nest modules are the mechanism that keeps a modular
monolith from becoming a ball of controllers. That is the EAD’s extraction
story: extract a module + its package ports, not “cut a Fastify plugin and
hope the DI graph comes with it.”

**Team scale:** Single CODEOWNER today. Nest’s conventions (module,
controller, guard, interceptor) are the onboarding map. Fastify standalone
optimizes for a single expert, not for many domains.

**Worker / AI scale:** Unchanged by this ADR. They remain separate
processes. A later ADR may choose Nest standalone (no HTTP) for
`apps/worker` or Fastify for `apps/ai-service`. Copying this decision
blindly into those apps is **not** authorized.

## 13. Migration implications

From ADR-0004 (current) to a product framework:

1. Keep URL contracts: `/health`, `/health/live`, `/health/ready` (and
   aliases if already used).
2. Keep `@buying-bot/config`, logger redaction, correlation IDs.
3. Replace `createOpsServer` **inside `apps/api` only**. Do not delete the
   helper until `apps/worker` and `apps/ai-service` have their own ADRs.
4. Do not move domain types into Nest DTO classes; HTTP DTOs stay adapters
   over `@buying-bot/types` + Zod.
5. Do not add product routes until NestJS + Fastify is scaffolded in a
   follow-up change. Acceptance of this ADR does not itself modify `apps/api`.

If A is accepted and later rejected:

- Domain packages remain valid (ports/Zod/auth).
- HTTP adapters in `apps/api` would be rewritten. That is contained if
  Nest types never enter `packages/*`.

Switching A → B later is cheap (adapter swap). Switching A → C later is
expensive (lose modules/guards). Switching C → A later is also expensive
(invented plugins → Nest modules). **Choosing C first to “stay light”
defers cost into the domain-building phase.**

## 14. Recommendation

**Recommend Option A: NestJS with the Fastify adapter for `apps/api`.**

Justification specific to this platform:

1. The EAD is a **modular monolith with many bounded contexts**, not a
   single CRUD service. Nest modules are the enforcement mechanism we do
   not have today.
2. Clean Architecture ports already exist (`Authenticator`, `Authorizer`,
   `DatabaseClient`, `ModelProvider`). Nest DI is the least-invention way
   to bind them at the `apps/api` edge.
3. RBAC must be server-side and easy to apply to every new admin/commerce
   route. Guards beat ad-hoc Fastify hooks as the surface grows
   (omnichannel + payments + AI tools).
4. Fastify as the **server** (not the application architecture) preserves
   webhook/AI ingress performance without taking Express’s slower default.
5. `apps/worker` and `apps/ai-service` stay independent. Nest in the API
   must enqueue, not consume, BullMQ jobs.
6. OpenAPI + URI versioning are required for `@buying-bot/sdk` and
   API-first evolution; Nest provides them without a custom layer.
7. Option C optimizes HTTP and under-serves DDD, DI, AuthZ consistency,
   and team scale — the actual risks in this codebase.
8. Option B is Nest without the HTTP engine this traffic mix wants, and
   with no Express dependency in the repo to justify it.

**Non-negotiable implementation constraints:**

- Use **Zod** (`@buying-bot/validation`), not `class-validator`.
- **No Nest imports in `packages/*`.**
- **No BullMQ processors in `apps/api`.**
- Preserve ADR-0004 health/log/shutdown contracts.
- Enable Fastify **raw body** before any payment/channel webhook.
- Do not add AuthN/Z or Prisma in the same change as framework scaffolding.

## 15. Consequences

- `apps/api` will be scaffolded with NestJS + Fastify adapter in a later
  change (not this ADR). Acceptance does not install dependencies or
  modify application code.
- ADR-0004 remains in force for `apps/worker` and `apps/ai-service` until
  those apps get their own framework ADRs. Product HTTP on `apps/api`
  remains blocked on the interim ops server until that follow-up scaffold.
- Coding standards should ban framework types in shared packages.
- A follow-up ADR is still required for AuthN/Z mechanism (sessions vs JWT
  vs OAuth) and another for Prisma/PostgreSQL.

## 16. Rejected alternatives

| Alternative                                 | Why rejected for Buying Bot Platform                                                                                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B — NestJS + Express adapter**            | Same application model as A with a slower HTTP adapter and Express middleware gravity. No in-repo Express requirement. Worse fit for webhook/AI ingress.                                 |
| **C — Fastify standalone**                  | Strong HTTP, weak modular-monolith enforcement. Would force a custom DI/module/guard system while domains, payments, and channels are being built. Poor team-scale and extraction story. |
| Remain on `node:http` (`createOpsServer`)   | ADR-0004 already forbids product routes there.                                                                                                                                           |
| Koa / Hono / tRPC                           | Would add a stack not aligned with Nest module extraction or the existing OpenAPI/SDK path; not requested.                                                                               |
| Nest default `class-validator` DTO style    | Conflicts with `@buying-bot/validation` (Zod) and ADR-0002 strict TS.                                                                                                                    |
| Nest monolith that also runs workers and AI | Violates EAD deployable split (`api` / `worker` / `ai-service`) and failure isolation.                                                                                                   |
| Microservices now                           | Violates modular-monolith-first principle.                                                                                                                                               |

## 17. Decision status

**Accepted.**

Indexed in [DECISIONS.md](../DECISIONS.md).

Acceptance records the framework choice only. It does **not** authorize
installing NestJS/Fastify, modifying `apps/api`, or changing `package.json`
in the same change. Scaffolding is a separate, explicit follow-up.
