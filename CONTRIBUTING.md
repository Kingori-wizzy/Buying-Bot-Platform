# Contributing to Buying Bot Platform

Thank you for contributing. This repository is an enterprise monorepo for an AI-powered omnichannel commerce platform.

**Architecture authority:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)  
**Decisions:** [docs/DECISIONS.md](./docs/DECISIONS.md)  
**Conduct:** [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)  
**Security:** [SECURITY.md](./SECURITY.md)

## Before you start

1. Read the [Enterprise Architecture Document](./docs/ARCHITECTURE.md).
2. Follow [coding standards](./docs/standards/coding-standards.md).
3. Use the [branching strategy](./docs/standards/branching-strategy.md).
4. Use the [versioning strategy](./docs/standards/versioning-strategy.md) and Conventional Commits.
5. Keep docs aligned with [documentation standards](./docs/standards/documentation-standards.md).

## Prerequisites

- Node.js **22** (see `.nvmrc`)
- pnpm **9+** (`corepack enable` recommended)
- Git with hooks enabled (Husky installs on `pnpm install`)

## Setup

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

## Development workflow

1. Create a short-lived branch from `main` (`feature/*`, `fix/*`, or `chore/*`).
2. Make focused changes. Do not scaffold applications unless the work is approved and covered by ADRs.
3. Ensure quality locally:

   ```bash
   pnpm format
   pnpm lint
   pnpm typecheck
   pnpm build
   pnpm test
   ```

4. Commit with a Conventional Commit message (enforced by Commitlint), for example:

   ```text
   feat(config): add shared eslint boundaries
   fix(ci): skip husky during frozen installs
   docs: clarify branching strategy
   ```

5. Open a pull request using the PR template. Link issues (`Fixes #123`) when applicable.
6. Address CODEOWNERS review feedback. CI must be green.

Pre-commit hooks run lint-staged (ESLint, Prettier, and typecheck when TypeScript files change). Do not use `--no-verify` except for approved emergency hotfixes (see coding standards).

## Where code belongs

| Kind                     | Location          |
| ------------------------ | ----------------- |
| Deployable app           | `apps/<name>`     |
| Shared library / config  | `packages/<name>` |
| IaC / environments       | `infrastructure/` |
| Architecture & standards | `docs/`           |

Dependency rule: **apps → packages only** (never reverse).

## Documentation expectations

- Update docs in the same PR when behavior, architecture, or tooling changes.
- Significant decisions need an ADR ([docs/DECISIONS.md](./docs/DECISIONS.md)).
- If a change updates principles or topology, update [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Reporting bugs and requesting features

Use GitHub Issue templates:

- Bug Report
- Feature Request

Do not report vulnerabilities through public issues — use [SECURITY.md](./SECURITY.md).

## CI parity

GitHub Actions runs: **install → lint → typecheck → build → test**.  
Details: [docs/github.md](./docs/github.md).

## Questions

For architecture questions, start from `docs/ARCHITECTURE.md` and open a discussion/issue with the `triage` label. Propose ADRs for decisions that would otherwise be tribal knowledge.
