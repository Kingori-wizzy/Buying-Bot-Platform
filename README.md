# Buying Bot Platform

AI-powered **digital products** commerce platform (admin-managed catalog), managed as a **pnpm + Turborepo** monorepo.

The shop catalog is published by administrators into PostgreSQL. External marketplace ingestion (Jumia/Kilimall/feeds) is deferred and disabled by default.

## Repository layout

```text
.
├── apps/                 # web, admin, api, ai-service, worker, docs (+ mobile later)
├── packages/             # Shared libraries and configs
├── infrastructure/       # docker, kubernetes, terraform, nginx, monitoring, scripts
├── docs/                 # Engineering docs (code-quality, github, …)
├── .github/              # Issue/PR templates, CODEOWNERS, Actions
├── .husky/               # Git hooks (pre-commit, commit-msg)
├── .vscode/              # Shared editor recommendations and workspace settings
├── packages/
│   ├── ui, types, config, database, auth, validation, utils, sdk, ai-core
│   ├── typescript-config/ # Shared strict TypeScript presets + path aliases
│   ├── eslint-config/     # Shared ESLint flat config
│   └── prettier-config/   # Shared Prettier config
├── package.json          # Root workspace manifest and scripts
├── pnpm-workspace.yaml   # pnpm workspace package globs
├── turbo.json            # Turborepo task pipeline
├── tsconfig.json         # Root TypeScript solution config
├── eslint.config.mjs     # Root ESLint entrypoint
├── lint-staged.config.mjs
├── commitlint.config.mjs
├── .nvmrc
├── .editorconfig
├── .gitignore
├── .prettierignore
└── README.md
```

## Prerequisites

- Node.js **22** (see `.nvmrc` — do not use Node 20)
- [pnpm](https://pnpm.io/) **9.15.9** (Corepack: `corepack enable && corepack prepare pnpm@9.15.9 --activate`)

Developer guide: [`docs/developer/getting-started.md`](docs/developer/getting-started.md)  
Architecture baseline: [`docs/DOCUMENTATION_BASELINE.md`](docs/DOCUMENTATION_BASELINE.md)

## Commands

From the repository root:

```bash
pnpm install          # Install workspace dependencies + Husky hooks
pnpm run check:node   # Enforce Node 22 major
pnpm build            # turbo run build
pnpm dev              # turbo run dev
pnpm lint             # ESLint (max-warnings=0)
pnpm lint:fix        # ESLint auto-fix
pnpm format           # Prettier write
pnpm format:check     # Prettier check
pnpm typecheck        # turbo run typecheck
pnpm test             # turbo run test
pnpm audit:deps       # pnpm audit --audit-level=high
pnpm verify           # node check + format + lint + typecheck + test + build + audit
pnpm clean            # turbo run clean
```

Copy `.env.example` to `.env` for local Node service configuration.

Local Postgres + Redis:

```bash
docker compose -f infrastructure/docker/compose/docker-compose.yml up -d postgres redis
```

Production readiness checklist: [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md).

## File catalog

### Root folders

| Path              | Purpose                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `apps/`           | Application shells: web, admin, api, ai-service, worker, docs. See `apps/README.md`.          |
| `packages/`       | Shared packages (`ui`, `types`, `config`, …) + engineering configs. See `packages/README.md`. |
| `infrastructure/` | Production skeleton: docker, kubernetes, terraform, nginx, monitoring, scripts.               |
| `docs/`           | Architecture, ADRs, standards, and operational catalogs.                                      |
| `.github/`        | Issue/PR templates, CODEOWNERS, and CI workflows. See `docs/github.md`.                       |
| `.vscode/`        | Shared VS Code/Cursor workspace settings and extension recommendations.                       |

### Workspace configuration

| File                  | Purpose                                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm-workspace.yaml` | Declares workspace members: `apps/*` and `packages/*`.                                                                                    |
| `package.json`        | Root private package; scripts for Turbo, ESLint, Prettier, Husky; quality toolchain dependencies.                                         |
| `turbo.json`          | Defines the task graph for `build`, `dev`, `lint`, `typecheck`, `test`, and `clean` with dependency ordering and cache outputs.           |
| `tsconfig.json`       | Root TypeScript config; extends shared `base` + `paths`; solution-style (`files`/`include` empty) until apps register project references. |
| `pnpm-lock.yaml`      | Deterministic lockfile created by `pnpm install` (generated, committed).                                                                  |

### TypeScript shared config (`packages/typescript-config`)

| File           | Purpose                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| `package.json` | Workspace package `@buying-bot/typescript-config` with preset exports.           |
| `base.json`    | Enterprise strict compiler policy shared by all presets.                         |
| `paths.json`   | Monorepo path aliases (`@buying-bot/*` → `packages/*/src`) using `${configDir}`. |
| `library.json` | Preset for shared packages (`composite`, `declaration`, `outDir`).               |
| `node.json`    | Preset for Node services (`NodeNext` resolution).                                |
| `bundler.json` | Preset for frontend apps (DOM libs, `Bundler` resolution, `noEmit`).             |
| `README.md`    | Inheritance rules for future apps and packages.                                  |

### Code quality

| File / package              | Purpose                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `packages/eslint-config/`   | Shared ESLint flat config (strict TS, import sort, unused imports). |
| `packages/prettier-config/` | Shared strict Prettier policy.                                      |
| `eslint.config.mjs`         | Root ESLint entrypoint.                                             |
| `.prettierignore`           | Prettier exclude list.                                              |
| `lint-staged.config.mjs`    | Pre-commit format, lint, and typecheck targets.                     |
| `commitlint.config.mjs`     | Conventional Commits rules.                                         |
| `.husky/pre-commit`         | Runs lint-staged.                                                   |
| `.husky/commit-msg`         | Runs Commitlint.                                                    |
| `docs/code-quality.md`      | Full documentation of the quality toolchain.                        |

### GitHub

| File / path                        | Purpose                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `.github/ISSUE_TEMPLATE/`          | Bug Report + Feature Request forms; template config.        |
| `.github/PULL_REQUEST_TEMPLATE.md` | Standard PR checklist and test plan.                        |
| `.github/CODEOWNERS`               | Default and path-based review ownership (`@Kingori-wizzy`). |
| `.github/workflows/ci.yml`         | CI: install → lint → typecheck → build → test.              |
| `docs/github.md`                   | Full documentation of every GitHub workflow and template.   |

### Engineering baselines

| File            | Purpose                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `.gitignore`    | Excludes dependencies, build artifacts, env/secrets, caches, OS/IDE noise, and common Python virtualenv/cache paths for future AI services. |
| `.editorconfig` | Enforces UTF-8, LF, final newline, 2-space indent (Markdown trailing whitespace preserved).                                                 |
| `.nvmrc`        | Pins Node.js major version `22` for local and CI alignment with `engines.node`.                                                             |
| `README.md`     | Platform overview, layout, commands, and documentation of every foundation file.                                                            |

### Editor workspace

| File                      | Purpose                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `.vscode/settings.json`   | Format-on-save, Prettier default formatter, ESLint fix-on-save, pnpm as package manager, search excludes for build caches. |
| `.vscode/extensions.json` | Recommends EditorConfig, Prettier, and ESLint extensions (stack-agnostic).                                                 |

### Git placeholders

| File                      | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `apps/.gitkeep`           | Keeps an empty `apps/` directory in version control.           |
| `infrastructure/.gitkeep` | Keeps an empty `infrastructure/` directory in version control. |

## TypeScript

All future apps and packages **must** extend a preset from `@buying-bot/typescript-config` (`library`, `node`, or `bundler`). See [`packages/typescript-config/README.md`](packages/typescript-config/README.md).

Path alias convention:

- `@buying-bot/*` → `packages/*/src`

## Code quality

See [`docs/code-quality.md`](docs/code-quality.md) for the complete configuration catalog.

Summary:

- **Format:** Prettier (strict) + format-on-save
- **Lint:** ESLint 9 flat config with import ordering and unused-import detection
- **Types:** `pnpm typecheck` via Turbo (also on pre-commit when TS files are staged)
- **Commits:** Husky + lint-staged + Commitlint (Conventional Commits)

## GitHub

See [`docs/github.md`](docs/github.md) and [`docs/Deployment/GITHUB_ACTIONS_AND_SECRETS.md`](docs/Deployment/GITHUB_ACTIONS_AND_SECRETS.md).

CI pipeline (`.github/workflows/ci.yml`): **install → lint → typecheck → build → test**.

Remote: [Kingori-wizzy/Buying-Bot-Platform](https://github.com/Kingori-wizzy/Buying-Bot-Platform).

## Repository standards

Enterprise standards align with the [Enterprise Architecture Document](docs/ARCHITECTURE.md).

| Document                                                                               | Purpose                                            |
| -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [CONTRIBUTING.md](CONTRIBUTING.md)                                                     | How to set up, branch, commit, and open PRs        |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)                                               | Community behavior and enforcement                 |
| [SECURITY.md](SECURITY.md)                                                             | Private vulnerability reporting                    |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                                           | Enterprise Architecture Document (source of truth) |
| [docs/DECISIONS.md](docs/DECISIONS.md)                                                 | ADR process and decision log                       |
| [docs/standards/branching-strategy.md](docs/standards/branching-strategy.md)           | Trunk-based branching rules                        |
| [docs/standards/versioning-strategy.md](docs/standards/versioning-strategy.md)         | SemVer + Conventional Commits                      |
| [docs/standards/coding-standards.md](docs/standards/coding-standards.md)               | Language, boundaries, quality non-negotiables      |
| [docs/standards/documentation-standards.md](docs/standards/documentation-standards.md) | Doc hierarchy and writing rules                    |

## Applications

See [`apps/README.md`](apps/README.md) for the application portfolio and build rules.

Independent build example:

```bash
pnpm --filter @buying-bot/api build
pnpm build
```

## Design constraints (current phase)

- Application **shells only** — no product features
- Shared domain packages remain unimplemented placeholders
- Framework choices (Next/Vite/Nest/etc.) require ADRs before adoption

## Next steps

1. Commit and push to [Kingori-wizzy/Buying-Bot-Platform](https://github.com/Kingori-wizzy/Buying-Bot-Platform).
2. Enable branch protection on `main` requiring the CI check.
3. Choose app frameworks via ADRs, then implement features behind quality gates.
