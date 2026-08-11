# `@buying-bot/docs`

Documentation site application shell.

## Responsibility

Deployable documentation website for the platform (guides, references, portals).

Repository engineering documents (EAD, ADR, standards) remain in `/docs`. This application will present published documentation when a site generator is chosen (future ADR).

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

Scaffold only — no docs framework or content pipeline yet.
