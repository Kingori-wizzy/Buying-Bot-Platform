# `@buying-bot/api`

Backend API application shell.

## Responsibility

System-of-record HTTP APIs and orchestration edge for omnichannel clients.

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

Scaffold only — no HTTP framework or routes yet.
