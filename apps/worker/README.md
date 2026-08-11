# `@buying-bot/worker`

Background Worker application shell.

## Responsibility

Async jobs, queues, and scheduled processing for the platform.

## TypeScript

Extends `@buying-bot/typescript-config/node.json` (`NodeNext`, Node types). Build emits to `dist/`.

## Scripts

| Script           | Purpose                      |
| ---------------- | ---------------------------- |
| `pnpm build`     | Compile TypeScript → `dist/` |
| `pnpm typecheck` | Typecheck only               |
| `pnpm dev`       | Watch compile                |
| `pnpm test`      | Placeholder (future-ready)   |
| `pnpm clean`     | Remove `dist/`               |

## Status

Scaffold only — no queue consumers or schedules yet.
