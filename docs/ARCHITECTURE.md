# Buying Bot Platform — Enterprise Architecture Document

**Status:** Active  
**Scope:** Repository and platform engineering architecture  
**Audience:** Architects, technical leads, and contributors  
**Related:** [DECISIONS.md](./DECISIONS.md), [standards/](./standards/), [CONTRIBUTING.md](../CONTRIBUTING.md)

This document is the **source of truth** for platform architecture. Repository standards (branching, versioning, coding, documentation, security, and contribution process) must align with it.

---

## 1. Mission

The Buying Bot Platform is an **AI-powered omnichannel commerce ecosystem**. It enables consistent buying experiences across digital channels while centralizing domain logic, AI assistance, and operational control.

## 2. System context

| Capability          | Home               | Responsibility                             |
| ------------------- | ------------------ | ------------------------------------------ |
| Customer Website    | `apps/web`         | Shopper-facing storefront and journeys     |
| Admin Dashboard     | `apps/admin`       | Merchandising, ops, configuration          |
| Backend API         | `apps/api`         | System of record APIs and orchestration    |
| AI Service          | `apps/ai-service`  | Model/prompt orchestration service process |
| Background Worker   | `apps/worker`      | Async jobs, queues, scheduled work         |
| Docs site           | `apps/docs`        | Deployable documentation website           |
| Shared Packages     | `packages/*`       | Reusable libraries, contracts, configs     |
| Engineering docs    | `docs/*`           | Architecture, ADRs, standards, runbooks    |
| Infrastructure      | `infrastructure/*` | Environments, IaC, deployment definitions  |
| Mobile App (future) | `apps/mobile`      | Native/omnichannel client                  |

Deployables live under `apps/`. Reuse and cross-cutting policy live under `packages/`. Runtime topology and environments live under `infrastructure/`.

## 3. Architectural principles

1. **Monorepo, independently deployable apps** — One repository for shared contracts and atomic cross-cutting changes; each app remains a separate deployable unit.
2. **Contracts before implementations** — Shared types/schemas and ADRs precede feature code that crosses boundaries.
3. **Strict TypeScript by default** — All TS apps/packages inherit `@buying-bot/typescript-config`.
4. **Quality gates are non-optional** — Lint, typecheck, build, and tests run locally (hooks) and in CI.
5. **Security and least privilege** — No secrets in git; private reporting via `SECURITY.md`; CI uses minimal permissions.
6. **Documentation is part of the product** — Architecture and decisions are versioned with code.
7. **Defer stack lock-in until justified** — Application frameworks are chosen via ADRs when apps are scaffolded; foundation tooling is already decided.

## 4. Monorepo architecture

### 4.1 Tooling (decided)

| Concern            | Choice              | Rationale                                                |
| ------------------ | ------------------- | -------------------------------------------------------- |
| Workspace          | pnpm workspaces     | Strict dependency graph, efficient installs              |
| Task orchestration | Turborepo           | Cached `build` / `typecheck` / `test` / `lint` pipelines |
| Language baseline  | TypeScript (strict) | Shared contracts across web, admin, API, packages        |
| Node runtime       | Node 22 (`.nvmrc`)  | Active enterprise LTS target                             |
| Package namespace  | `@buying-bot/*`     | Clear ownership and path-alias alignment                 |

### 4.2 Repository topology

```text
apps/             Deployable applications
packages/         Shared libraries and engineering configs
infrastructure/   IaC and environment definitions
docs/             Architecture, ADRs, standards
.github/          Templates, CODEOWNERS, Dependabot, Actions
.vscode/          Editor defaults aligned with quality toolchain
```

Workspace members: `apps/*`, `packages/*` (`pnpm-workspace.yaml`).

### 4.3 Dependency direction

```text
apps/*  →  packages/*  →  (no reverse dependency on apps)
```

- Applications may depend on shared packages.
- Shared packages must not depend on applications.
- Cross-app imports are forbidden; share via `packages/` or API contracts.

### 4.4 Path aliases

- `@buying-bot/*` → `packages/*/src`
- Optional per-app `@/*` for local `src` only

### 4.5 Shared package portfolio

Domain packages (folders reserved; implementation deferred):

| Package                  | Responsibility                                       |
| ------------------------ | ---------------------------------------------------- |
| `@buying-bot/ui`         | Shared UI primitives / design-system building blocks |
| `@buying-bot/types`      | Cross-app TypeScript types and domain contracts      |
| `@buying-bot/config`     | Runtime configuration helpers and typed env patterns |
| `@buying-bot/database`   | Data-access abstractions and persistence utilities   |
| `@buying-bot/auth`       | Authentication/authorization contracts and utilities |
| `@buying-bot/validation` | Shared input validation schemas and validators       |
| `@buying-bot/utils`      | Generic, domain-agnostic helpers                     |
| `@buying-bot/sdk`        | Typed client SDK for platform APIs                   |
| `@buying-bot/ai-core`    | Shared AI primitives (not the `apps/ai` service)     |

Index: [`packages/README.md`](../packages/README.md).

### 4.6 Application shells

Independent TypeScript application scaffolds (no product features yet):

| App          | Package                  | TS preset                    | Build           |
| ------------ | ------------------------ | ---------------------------- | --------------- |
| `web`        | `@buying-bot/web`        | base + paths + DOM / Bundler | `tsc` → `dist/` |
| `admin`      | `@buying-bot/admin`      | base + paths + DOM / Bundler | `tsc` → `dist/` |
| `docs`       | `@buying-bot/docs`       | base + paths + DOM / Bundler | `tsc` → `dist/` |
| `api`        | `@buying-bot/api`        | `node.json`                  | `tsc` → `dist/` |
| `ai-service` | `@buying-bot/ai-service` | `node.json`                  | `tsc` → `dist/` |
| `worker`     | `@buying-bot/worker`     | `node.json`                  | `tsc` → `dist/` |

Each app can be built with `pnpm --filter <package> build`. Portfolio details: [`apps/README.md`](../apps/README.md).

## 5. Quality architecture

| Layer           | Mechanism                                                              |
| --------------- | ---------------------------------------------------------------------- |
| Format          | Prettier (`@buying-bot/prettier-config`)                               |
| Lint            | ESLint 9 flat config (`@buying-bot/eslint-config`)                     |
| Types           | Shared TS presets + Turbo `typecheck`                                  |
| Pre-commit      | Husky + lint-staged                                                    |
| Commit messages | Commitlint + Conventional Commits                                      |
| CI              | `.github/workflows/ci.yml` — install → lint → typecheck → build → test |

Details: [code-quality.md](./code-quality.md), [github.md](./github.md).

## 6. Delivery architecture

| Concern      | Standard                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Branching    | Trunk-based with short-lived `feature/*`, `fix/*`, `chore/*` — [branching-strategy.md](./standards/branching-strategy.md) |
| Versioning   | SemVer + Conventional Commits — [versioning-strategy.md](./standards/versioning-strategy.md)                              |
| Reviews      | Pull requests + CODEOWNERS                                                                                                |
| Dependencies | Dependabot (npm + GitHub Actions)                                                                                         |

## 7. Security architecture (repository level)

- Secrets never committed; use `.env.example` patterns when apps arrive.
- Vulnerabilities reported per [SECURITY.md](../SECURITY.md).
- CI permissions default to `contents: read`.
- Dependency updates are automated and reviewed.

## 8. Evolution model

1. Propose significant change via ADR ([DECISIONS.md](./DECISIONS.md)).
2. Update this Enterprise Architecture Document when principles or topology change.
3. Keep standards docs in `docs/standards/` synchronized with ADRs.
4. Scaffold apps only after the relevant stack ADR is accepted.

## 9. Current phase boundaries

**In scope now:** Engineering foundation (monorepo, TypeScript, quality, GitHub, standards).  
**Out of scope now:** Application business logic, framework scaffolds, production infrastructure manifests.

## 10. Document control

| Version | Date       | Notes                                                                  |
| ------- | ---------- | ---------------------------------------------------------------------- |
| 0.1.0   | 2026-08-11 | Initial Enterprise Architecture Document aligned to Phase 1 foundation |
