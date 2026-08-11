# Applications

Deployable application shells for the Buying Bot Platform.

**Policy:** Scaffolding only — no product features yet.  
**Aligns with:** [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)

## Portfolio

| App                            | Package name             | Runtime profile      | Responsibility                           |
| ------------------------------ | ------------------------ | -------------------- | ---------------------------------------- |
| [`web/`](./web/)               | `@buying-bot/web`        | Browser / bundler TS | Customer-facing storefront               |
| [`admin/`](./admin/)           | `@buying-bot/admin`      | Browser / bundler TS | Operations & merchandising dashboard     |
| [`api/`](./api/)               | `@buying-bot/api`        | Node.js              | Backend HTTP API / system of record edge |
| [`ai-service/`](./ai-service/) | `@buying-bot/ai-service` | Node.js              | AI orchestration service                 |
| [`worker/`](./worker/)         | `@buying-bot/worker`     | Node.js              | Background jobs and async processing     |
| [`docs/`](./docs/)             | `@buying-bot/docs`       | Browser / bundler TS | Documentation site application shell     |

Markdown engineering docs remain under repository [`docs/`](../docs/); `apps/docs` is the future **docs website** deployable.

## Architecture rules

1. **Independent build** — each app defines its own `build`, `typecheck`, `test`, `clean` scripts and emits to its local `dist/`.
2. **Shared TypeScript** — every app extends `@buying-bot/typescript-config` (see each `tsconfig.json`).
3. **Dependency direction** — apps may depend on `packages/*`; apps must not import each other.
4. **Turbo** — root `pnpm build` / `pnpm typecheck` / `pnpm test` orchestrate all apps via Turborepo.
5. **No cross-app deep imports** — share through `@buying-bot/*` packages or API contracts.

```text
apps/*  →  packages/*  →  (never back to apps)
```

## TypeScript presets

| Apps                          | Extends                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| `web`, `admin`, `docs`        | `base` + `paths`, DOM libs, Bundler resolution, emit to `dist/` |
| `api`, `ai-service`, `worker` | `node` preset (`NodeNext`, `@types/node`)                       |

## Common scripts

```bash
pnpm --filter @buying-bot/web build
pnpm --filter @buying-bot/api typecheck
pnpm build          # all apps/packages with build scripts
```

## Status

Each application contains a minimal `src/index.ts` bootstrap placeholder only.
