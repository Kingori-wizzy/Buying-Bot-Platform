# Branching strategy

**Aligns with:** [ARCHITECTURE.md](../ARCHITECTURE.md) §6 Delivery architecture

## Model

**Trunk-based development** with short-lived topic branches and pull requests into `main`.

`main` is always the integration branch. It must remain releasable.

## Branch types

| Branch  | Pattern                       | Lifetime   | Purpose                                        |
| ------- | ----------------------------- | ---------- | ---------------------------------------------- |
| Trunk   | `main`                        | permanent  | Production-ready integration line              |
| Feature | `feature/<short-description>` | days       | New capability                                 |
| Fix     | `fix/<short-description>`     | days       | Defect repair                                  |
| Chore   | `chore/<short-description>`   | days       | Tooling, deps, docs-only engineering           |
| Hotfix  | `hotfix/<short-description>`  | hours–days | Production emergency fix (when releases exist) |
| Release | `release/vX.Y.Z`              | short      | Optional stabilization line for versioned cuts |

Do not use long-lived personal branches or permanent `develop` unless an ADR supersedes this document.

## Rules

1. Branch from latest `main`.
2. Keep branches small and focused (ideally one concern).
3. Open a PR early; keep it updated with `main`.
4. Delete the branch after merge.
5. Protect `main` (PR required, CI required, CODEOWNERS when teams are configured).
6. No force-push to `main`.
7. Prefer rebase/update locally; do not rewrite shared history on `main`.

## Naming

- Use kebab-case descriptions: `feature/cart-totals`, `fix/login-redirect`.
- Optionally include issue id: `fix/123-empty-cart`.

## Merge policy

- Squash merge is preferred for feature work to keep `main` history readable and Conventional Commit–friendly.
- Merge commits may be used for release trains when explicitly needed.
- PR title should follow Conventional Commits (`feat:`, `fix:`, etc.) because it often becomes the squash commit subject.

## Alignment with CI

Every PR must pass `.github/workflows/ci.yml` before merge: install → lint → typecheck → build → test.
