# Code quality configuration

Repository-wide standards for formatting, linting, typechecking, and commit messages.

## Toolchain overview

| Tool                             | Role                                                                  |
| -------------------------------- | --------------------------------------------------------------------- |
| **Prettier**                     | Strict, automatic code formatting                                     |
| **ESLint**                       | Static analysis, import order, unused imports, TypeScript rules       |
| **TypeScript (`tsc` via Turbo)** | Type checking across workspace packages                               |
| **lint-staged**                  | Runs format/lint/typecheck on staged files before commit              |
| **Husky**                        | Git hook runner (`pre-commit`, `commit-msg`)                          |
| **Commitlint**                   | Enforces [Conventional Commits](https://www.conventionalcommits.org/) |

## Workflow

1. **On save (editor):** Prettier formats; ESLint auto-fixes (see `.vscode/settings.json`).
2. **On `git commit` (pre-commit):** `lint-staged` runs ESLint + Prettier on staged files; TypeScript typecheck runs when `.ts`/`.tsx` files are staged.
3. **On `git commit` (commit-msg):** Commitlint validates the message against Conventional Commits.

## Root scripts

| Script              | Command                           | Purpose                                 |
| ------------------- | --------------------------------- | --------------------------------------- |
| `pnpm lint`         | `eslint . --max-warnings=0`       | Lint entire repo; warnings fail the run |
| `pnpm lint:fix`     | `eslint . --fix --max-warnings=0` | Auto-fix then lint                      |
| `pnpm format`       | `prettier --write .`              | Format all supported files              |
| `pnpm format:check` | `prettier --check .`              | CI-friendly format verification         |
| `pnpm typecheck`    | `turbo run typecheck`             | Package typecheck pipeline              |
| `pnpm prepare`      | `husky`                           | Install Git hooks after `pnpm install`  |

---

## Configuration catalog

### `packages/prettier-config/`

Shared Prettier preset. Referenced from root `package.json` via `"prettier": "@buying-bot/prettier-config"`.

| File           | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| `package.json` | Workspace package `@buying-bot/prettier-config`      |
| `index.js`     | Exported Prettier options (strict formatting policy) |
| `README.md`    | Package usage notes                                  |

**Options in `index.js`:**

| Option            | Value        | Intent                                      |
| ----------------- | ------------ | ------------------------------------------- |
| `semi`            | `true`       | Require semicolons                          |
| `singleQuote`     | `true`       | Prefer single quotes in JS/TS               |
| `trailingComma`   | `"all"`      | Trailing commas where valid (cleaner diffs) |
| `printWidth`      | `80`         | Wrap threshold                              |
| `tabWidth`        | `2`          | Indent width                                |
| `useTabs`         | `false`      | Spaces only                                 |
| `arrowParens`     | `"always"`   | Always `(x) => x`                           |
| `endOfLine`       | `"lf"`       | LF endings (matches `.editorconfig`)        |
| `bracketSpacing`  | `true`       | `{ foo: true }`                             |
| `bracketSameLine` | `false`      | Put `>` of JSX on its own line              |
| `proseWrap`       | `"preserve"` | Do not reflow Markdown prose aggressively   |

### `.prettierignore`

Excludes build artifacts, lockfile, caches, and generated outputs from formatting.

### `packages/eslint-config/`

Shared ESLint flat config factory.

| File           | Purpose                                        |
| -------------- | ---------------------------------------------- |
| `package.json` | Workspace package + ESLint plugin dependencies |
| `index.js`     | `createConfig({ tsconfigRootDir })` factory    |
| `README.md`    | Package usage notes                            |

**Capabilities wired in `index.js`:**

| Capability                  | Implementation                                                             |
| --------------------------- | -------------------------------------------------------------------------- |
| JS recommended rules        | `@eslint/js` → `eslint.configs.recommended`                                |
| Strict TypeScript           | `typescript-eslint` → `strictTypeChecked`                                  |
| Stylistic TypeScript        | `typescript-eslint` → `stylisticTypeChecked`                               |
| Type-aware linting          | `parserOptions.projectService: true`                                       |
| Import ordering             | `eslint-plugin-simple-import-sort` (`imports`/`exports` = error)           |
| Unused imports              | `eslint-plugin-unused-imports` (unused imports + vars; `_` prefix allowed) |
| Prettier conflict removal   | `eslint-config-prettier` (last in the chain)                               |
| Node globals for JS configs | `globals.node` on `*.{js,mjs,cjs}`                                         |

Unused-variable policy: `@typescript-eslint/no-unused-vars` is disabled in favor of `unused-imports/no-unused-vars` so imports and variables are handled consistently.

### `eslint.config.mjs`

Root ESLint entrypoint. Calls `createConfig({ tsconfigRootDir: import.meta.dirname })` so type-aware rules resolve from the monorepo root.

### `lint-staged.config.mjs`

| Glob                                       | Actions                                                         |
| ------------------------------------------ | --------------------------------------------------------------- |
| `*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}`        | `eslint --fix --max-warnings=0`, then `prettier --write`        |
| `*.{json,jsonc,md,yml,yaml,css,scss,html}` | `prettier --write`                                              |
| `*.{ts,tsx,mts,cts}`                       | `pnpm run typecheck` (once per commit if any TS file is staged) |

### `commitlint.config.mjs`

Extends `@commitlint/config-conventional` (Conventional Commits).

Additional rules:

| Rule                   | Level | Value                                             |
| ---------------------- | ----- | ------------------------------------------------- |
| `body-max-line-length` | error | 100                                               |
| `header-max-length`    | error | 100                                               |
| `subject-case`         | error | forbids sentence/start/pascal/upper case subjects |

**Allowed commit types (conventional):** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Examples:

```text
feat: add shared eslint config
fix(api): handle empty cart total
docs: document code quality toolchain
```

### `.husky/pre-commit`

Runs `pnpm exec lint-staged` before each commit.

### `.husky/commit-msg`

Runs `pnpm exec commitlint --edit "$1"` to validate the commit message.

### `.vscode/settings.json`

| Setting                         | Purpose                                            |
| ------------------------------- | -------------------------------------------------- |
| `editor.formatOnSave`           | Automatic Prettier formatting                      |
| `editor.defaultFormatter`       | Prettier extension                                 |
| `source.fixAll.eslint`          | ESLint fixes on save (import sort, unused imports) |
| `source.organizeImports: never` | Avoid fighting `simple-import-sort`                |
| `eslint.useFlatConfig`          | ESLint 9 flat config support                       |

### `.vscode/extensions.json`

Recommends EditorConfig, Prettier, and ESLint extensions.

---

## Conventional Commits

Format:

```text
<type>(optional-scope): <description>

[optional body]

[optional footer]
```

Breaking changes: add `BREAKING CHANGE:` in the body/footer, or `!` after the type/scope (`feat!: ...`).

---

## Adding a new app or package

1. Extend `@buying-bot/typescript-config` in the package `tsconfig.json`.
2. Add a `typecheck` script (for example `tsc -p tsconfig.json --noEmit`) so Turbo/lint-staged typecheck includes it.
3. Do **not** add local Prettier/ESLint style overrides unless an ADR justifies them.
