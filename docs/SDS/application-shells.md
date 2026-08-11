# Application shells — software design note

**Status:** Scaffold  
**Aligns with:** [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §4.6, [`../../apps/README.md`](../../apps/README.md)

## Purpose

Records the initial deployable application topology before feature implementation.

## Deployables

```text
apps/web          →  @buying-bot/web         (customer website)
apps/admin        →  @buying-bot/admin       (admin dashboard)
apps/api          →  @buying-bot/api         (backend API)
apps/ai-service   →  @buying-bot/ai-service  (AI service)
apps/worker       →  @buying-bot/worker      (background worker)
apps/docs         →  @buying-bot/docs        (docs website)
```

## Design constraints

1. Each app owns its `package.json`, `tsconfig.json`, and `src/` entry.
2. All apps inherit `@buying-bot/typescript-config`.
3. Builds are independent (`tsc` → local `dist/`) and Turbo-orchestrated at the root.
4. No app-to-app imports; share via `packages/*` or network contracts.
5. `apps/docs` is a site shell; normative engineering docs stay in `/docs`.

## Non-goals (current)

- HTTP routers, UI frameworks, queue libraries, model providers
- Business features and domain workflows
