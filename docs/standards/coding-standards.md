# Coding standards

**Aligns with:** [ARCHITECTURE.md](../ARCHITECTURE.md) §§3–5, [ADR-0002](../adr/0002-typescript-strict-shared-config.md), [ADR-0003](../adr/0003-conventional-commits-quality-gates.md)  
**Tooling details:** [code-quality.md](../code-quality.md)

## Language and runtime

- TypeScript for all new application and shared package code unless an ADR approves an exception (for example Python for a specialized AI runtime).
- Node.js version must match `.nvmrc` / `engines` (Node 22+).
- Package manager is **pnpm** only (no npm/yarn lockfiles).

## Project inheritance (mandatory)

| Project kind           | Must extend                                  |
| ---------------------- | -------------------------------------------- |
| Shared library         | `@buying-bot/typescript-config/library.json` |
| Node service           | `@buying-bot/typescript-config/node.json`    |
| Frontend / bundler app | `@buying-bot/typescript-config/bundler.json` |

Do not weaken `strict` or remove enterprise checks without an ADR.

## Style and static analysis

- **Prettier** is the only formatting authority (`@buying-bot/prettier-config`).
- **ESLint** enforces correctness and consistency (`@buying-bot/eslint-config`).
- Import order is enforced (`simple-import-sort`); do not use editor “organize imports” that conflicts.
- Unused imports and variables are errors; prefix intentionally unused bindings with `_`.
- `pnpm lint` must pass with zero warnings (`--max-warnings=0`).

## Structure and boundaries

- Place deployables under `apps/<name>`.
- Place reusable code under `packages/<name>`.
- Dependency direction: `apps` → `packages` only.
- Prefer `@buying-bot/<package>` imports for shared code.
- No cross-app deep imports.
- Keep modules small, explicit, and testable; avoid hidden side effects at import time.

## API and domain practice (forward-looking)

- Validate inputs at trust boundaries.
- Fail closed on authorization errors.
- Do not log secrets, tokens, or raw personal data.
- Prefer typed contracts in shared packages over duplicated DTOs.
- Feature flags / config belong in explicit configuration layers, not scattered literals (detail via future ADRs).

## Testing expectations

- New behavior ships with automated tests when a test runner is introduced for that package.
- `pnpm test` is part of CI and must remain green.
- Prefer deterministic tests; no reliance on production services without fakes/contracts.

## Git and review hygiene

- Conventional Commits only (Commitlint enforced).
- Keep PRs focused; follow [branching-strategy.md](./branching-strategy.md).
- Do not commit `node_modules`, build outputs, `.env`, or credentials.

## Non-negotiables

1. CI quality gate on every PR.
2. No secrets in the repository.
3. No bypassing Husky/lint-staged for convenience (`--no-verify` is prohibited unless an incident lead approves an emergency hotfix and a follow-up fix PR is filed immediately).
