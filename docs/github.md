# GitHub configuration

Secrets and deploy workflows: [Deployment/GITHUB_ACTIONS_AND_SECRETS.md](./Deployment/GITHUB_ACTIONS_AND_SECRETS.md).  
Dependabot is **not** used.

## Directory map

```text
.github/
├── CODEOWNERS
├── PULL_REQUEST_TEMPLATE.md
├── ISSUE_TEMPLATE/
│   ├── config.yml
│   ├── bug_report.yml
│   └── feature_request.yml
└── workflows/
    ├── ci.yml
    ├── staging-deploy.yml
    └── production-deploy.yml
```

## Issue templates

- `blank_issues_enabled: false`
- Security reports: GitHub Security Advisories (see [SECURITY.md](../SECURITY.md))
- Bug report / feature request forms with required areas and acceptance criteria

## Pull request template

Standard summary, type, test plan, risk, secrets checklist.

## CODEOWNERS

Default `@Kingori-wizzy` for `*`, `.github/`, `packages/`, `docs/`, apps, and infrastructure.

## Workflows

| Workflow          | Trigger             | Notes                                                                                                                     |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| CI                | push `main`, PRs    | frozen lockfile, gitleaks, migrate, lint, typecheck, test, integrity, smoke, e2e API, security:gate, audit, Docker builds |
| Staging deploy    | tags `v*`, dispatch | GHCR push; SSH only if staging secrets exist                                                                              |
| Production deploy | **manual** dispatch | Protected `production` environment; confirmation `deploy-production`                                                      |

CI permissions: `contents: read`. Production deploy must never run on unreviewed push to main.
