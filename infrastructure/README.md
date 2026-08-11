# Infrastructure

Production-oriented infrastructure layout for the Buying Bot Platform monorepo.

**Policy:** This tree is a skeleton only. Deployment code (Dockerfiles, manifests, Terraform, nginx configs, dashboards, executable scripts) is added later via ADRs and reviewed PRs.

**Aligns with:** [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md), [`docs/Deployment/`](../docs/Deployment/)

## Top-level folders

| Folder                         | Purpose                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| [`docker/`](./docker/)         | Container image definitions and Compose layouts (when authored) |
| [`kubernetes/`](./kubernetes/) | Cluster workloads, shared bases, and environment overlays       |
| [`terraform/`](./terraform/)   | Cloud/account IaC modules and per-environment roots             |
| [`nginx/`](./nginx/)           | Edge/reverse-proxy configuration assets                         |
| [`monitoring/`](./monitoring/) | Metrics, logs, dashboards, and alerting assets                  |
| [`scripts/`](./scripts/)       | Operational and CI helper scripts (non-application)             |

## Rules

1. No secrets in this tree — use secret managers / CI secrets.
2. Prefer environment overlays over copy-pasted prod configs.
3. App runtime code stays in `apps/`; only packaging and ops live here.
4. Document meaningful additions under `docs/Deployment/` and ADRs when topology changes.
