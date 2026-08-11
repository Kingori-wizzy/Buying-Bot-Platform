# `@buying-bot/prettier-config`

Shared Prettier configuration for the monorepo.

## Usage

Root `package.json` references this package:

```json
{
  "prettier": "@buying-bot/prettier-config"
}
```

Workspace packages inherit the same config through Prettier’s upward resolution to the repository root.
