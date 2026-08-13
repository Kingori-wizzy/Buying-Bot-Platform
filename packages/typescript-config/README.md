# `@buying-bot/typescript-config`

Shared TypeScript configuration for every application and package in this monorepo.

## Presets

| Preset         | Use for                                            |
| -------------- | -------------------------------------------------- |
| `base.json`    | Core compiler policy (do not extend alone in apps) |
| `paths.json`   | Monorepo path aliases (`@buying-bot/*`)            |
| `library.json` | Shared packages under `packages/*`                 |
| `node.json`    | Node.js services (`api`, `worker`, tooling)        |
| `bundler.json` | Frontend apps consumed by Vite/Next/etc.           |

## Required inheritance (future apps)

Every application under `apps/<name>` must include a `tsconfig.json` that extends one of the environment presets (those already include `base` + `paths`):

```json
{
  "extends": "@buying-bot/typescript-config/bundler.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@buying-bot/*": ["../../packages/*/src"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Node services:

```json
{
  "extends": "@buying-bot/typescript-config/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Shared libraries:

```json
{
  "extends": "@buying-bot/typescript-config/library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "tsBuildInfoFile": "dist/.tsbuildinfo"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Set `outDir` / `rootDir` in the consuming project (not only in the shared preset) so paths resolve relative to the app/package.

## Path aliases

| Alias           | Resolves to                               |
| --------------- | ----------------------------------------- |
| `@buying-bot/*` | `packages/*/src` (from the monorepo root) |

`paths.json` maps `@buying-bot/*` with `${configDir}/../../packages/*/src` (no `baseUrl`; deprecated in TypeScript 6). TypeScript substitutes `${configDir}` with the **consuming** project directory, so this is valid for packages at `apps/<name>` and `packages/<name>` only. The repository root `tsconfig.json` defines the same aliases as `./packages/*/src`.

Optional local app alias `@/*` → `./*` may be added per app; if you override `paths`, re-declare `@buying-bot/*` as well (TypeScript replaces the whole `paths` map on override).

## Dependency

Apps and packages should declare:

```json
{
  "devDependencies": {
    "@buying-bot/typescript-config": "workspace:*",
    "typescript": "workspace:*"
  }
}
```

Or rely on the root workspace TypeScript installation for editor tooling.
