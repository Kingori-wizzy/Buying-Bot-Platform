# `@buying-bot/web`

Customer Website application shell.

## Responsibility

Shopper-facing storefront and buying journeys for the omnichannel platform.

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
