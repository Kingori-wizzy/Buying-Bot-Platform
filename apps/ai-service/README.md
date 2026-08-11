# `@buying-bot/ai-service`

AI Service application shell.

## Responsibility

Deployable AI orchestration service (model/prompt/tool runtime). Shared primitives belong in `@buying-bot/ai-core`.

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

Scaffold only — no model providers or endpoints yet.
