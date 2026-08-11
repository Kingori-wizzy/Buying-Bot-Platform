# `@buying-bot/eslint-config`

Shared ESLint flat configuration for all apps and packages.

## Usage

Root `eslint.config.mjs`:

```js
import { createConfig } from '@buying-bot/eslint-config';

export default createConfig({
  tsconfigRootDir: import.meta.dirname,
});
```

## Included capabilities

- TypeScript strict + stylistic type-checked rules (`typescript-eslint`)
- Import ordering (`eslint-plugin-simple-import-sort`)
- Unused import / variable detection (`eslint-plugin-unused-imports`)
- Prettier compatibility (`eslint-config-prettier` disables conflicting style rules)
