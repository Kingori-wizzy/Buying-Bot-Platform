# `@buying-bot/admin`

Admin Dashboard application shell.

## Responsibility

Merchandising, operations, and platform configuration UI for internal users.

## TypeScript

Extends `@buying-bot/typescript-config` (`base` + `paths`) with DOM libraries and Bundler module resolution. Build emits to `dist/`.

## Scripts

| Script           | Purpose                      |
| ---------------- | ---------------------------- |
| `pnpm build`     | Compile TypeScript → `dist/` |
| `pnpm typecheck` | Typecheck only               |
| `pnpm dev`       | Watch compile                |
| `pnpm test`      | Placeholder (future-ready)   |
| `pnpm clean`     | Remove `dist/`               |

## Status

Scaffold only — no UI framework or product features yet.
