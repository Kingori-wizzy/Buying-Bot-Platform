# GitHub enterprise configuration

This document catalogs every GitHub template, ownership rule, dependency automation setting, and Actions workflow in the repository.

## Directory map

```text
.github/
├── CODEOWNERS
├── dependabot.yml
├── PULL_REQUEST_TEMPLATE.md
├── ISSUE_TEMPLATE/
│   ├── config.yml
│   ├── bug_report.yml
│   └── feature_request.yml
└── workflows/
    └── ci.yml
```

---

## Issue templates

### `.github/ISSUE_TEMPLATE/config.yml`

| Setting                | Value                   | Purpose                                              |
| ---------------------- | ----------------------- | ---------------------------------------------------- |
| `blank_issues_enabled` | `false`                 | Forces structured templates; reduces free-form noise |
| `contact_links`        | Security Advisories URL | Routes vulnerabilities away from public issues       |

Security Advisories:
https://github.com/Kingori-wizzy/Buying-Bot-Platform/security/advisories/new  
Reporting process: [SECURITY.md](../SECURITY.md).

### `.github/ISSUE_TEMPLATE/bug_report.yml`

Structured **Bug Report** form.

| Field                      | Required | Purpose                                                               |
| -------------------------- | -------- | --------------------------------------------------------------------- |
| Area                       | yes      | Maps defect to website, admin, API, AI, worker, packages, infra, docs |
| Summary                    | yes      | Short problem statement                                               |
| Steps to reproduce         | yes      | Deterministic reproduction path                                       |
| Expected / Actual behavior | yes      | Defines incorrect vs correct outcome                                  |
| Environment                | yes      | Runtime context for triage                                            |
| Logs / screenshots         | no       | Evidence (secrets must be redacted)                                   |
| Workaround                 | no       | Temporary mitigation                                                  |

Auto-applied labels: `bug`, `triage`. Title prefix: `bug: `.

### `.github/ISSUE_TEMPLATE/feature_request.yml`

Structured **Feature Request** form.

| Field                   | Required | Purpose                               |
| ----------------------- | -------- | ------------------------------------- |
| Area                    | yes      | Product/system boundary               |
| Problem statement       | yes      | User/operator pain before solutioning |
| Proposed solution       | yes      | Desired capability                    |
| Alternatives considered | no       | Avoids duplicate design debate        |
| Suggested priority      | yes      | Intake signal (not a commitment)      |
| Acceptance criteria     | yes      | Definition of done                    |

Auto-applied labels: `enhancement`, `triage`. Title prefix: `feat: `.

---

## Pull request template

### `.github/PULL_REQUEST_TEMPLATE.md`

Shown on every new pull request. Sections:

| Section             | Purpose                                     |
| ------------------- | ------------------------------------------- |
| Summary             | Why the change exists; issue links          |
| Type of change      | Aligns with Conventional Commits categories |
| Changes             | Reviewer-oriented bullet list               |
| Test plan           | Required local/CI verification checklist    |
| Manual verification | Human validation steps                      |
| Risk and rollback   | Operational safety                          |
| Checklist           | Secrets, docs, ownership, commit style      |

---

## CODEOWNERS

### `.github/CODEOWNERS`

Defines default review ownership.

| Pattern               | Owner            | Purpose                         |
| --------------------- | ---------------- | ------------------------------- |
| `*`                   | `@Kingori-wizzy` | Default reviewers for all files |
| `/.github/`           | `@Kingori-wizzy` | CI/templates ownership          |
| `/packages/*-config/` | `@Kingori-wizzy` | Shared engineering standards    |
| `/docs/`              | `@Kingori-wizzy` | Documentation ownership         |

Repository: [Kingori-wizzy/Buying-Bot-Platform](https://github.com/Kingori-wizzy/Buying-Bot-Platform).

When the project moves to a GitHub Organization, replace `@Kingori-wizzy` with `@org/team` slugs and split app ownership as needed.

---

## Dependabot

### `.github/dependabot.yml`

| Ecosystem        | Directory | Schedule                | PR limit | Notes                                               |
| ---------------- | --------- | ----------------------- | -------- | --------------------------------------------------- |
| `npm`            | `/`       | Weekly Monday 09:00 UTC | 10       | Groups ESLint, TypeScript, and core tooling updates |
| `github-actions` | `/`       | Weekly Monday 09:00 UTC | 5        | Keeps Actions versions current                      |

npm PRs use Conventional Commit prefix `chore` (with scope). Actions PRs use prefix `ci`.

Labels applied: `dependencies`, plus `npm` or `github-actions`.

---

## GitHub Actions workflows

### `.github/workflows/ci.yml` — **CI**

Primary continuous integration pipeline for the monorepo.

#### Triggers

| Event          | Branches / scope |
| -------------- | ---------------- |
| `push`         | `main`           |
| `pull_request` | all PRs          |

#### Concurrency

`ci-${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true` — newer runs cancel stale ones on the same ref.

#### Permissions

`contents: read` — least privilege for install/lint/build/test.

#### Job: `quality` (`Lint, typecheck, build, test`)

| Step                 | Action / command                                | Purpose                                                          |
| -------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Checkout             | `actions/checkout@v4`                           | Fetch repository                                                 |
| Setup pnpm           | `pnpm/action-setup@v4` (`9.15.9`)               | Match `packageManager`                                           |
| Setup Node.js        | `actions/setup-node@v4` + `.nvmrc` + pnpm cache | Node 22, dependency cache                                        |
| Install dependencies | `pnpm install --frozen-lockfile` (`HUSKY=0`)    | Reproducible install; skip local Git hooks in CI                 |
| Lint                 | `pnpm run lint`                                 | ESLint (`--max-warnings=0`)                                      |
| Type check           | `pnpm run typecheck`                            | Turbo `typecheck` across packages                                |
| Build                | `pnpm run build`                                | Turbo `build` across packages                                    |
| Test                 | `pnpm run test`                                 | Turbo `test` (future-ready; succeeds with 0 package tasks today) |

#### Future-ready behavior

With no application packages yet, Turbo reports **0 tasks** for `typecheck`, `build`, and `test`, and the job still passes. When apps/packages add those scripts, CI executes them automatically without workflow changes.

#### Local parity

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run test
```

Optional local extra (not in CI yet): `pnpm run format:check`.

---

## Recommended branch protection (manual in GitHub settings)

Configure on `main` after the first successful CI run:

1. Require pull request before merging
2. Require status check: **CI / Lint, typecheck, build, test**
3. Require review from Code Owners (`@Kingori-wizzy`)
4. Do not allow bypass for administrators in production orgs (policy choice)
5. Restrict force pushes and deletions
