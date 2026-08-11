# `infrastructure/terraform`

## Purpose

Home for **Terraform (or compatible IaC) roots and modules** that provision cloud accounts, networks, data stores, and platform dependencies.

## Folder structure

| Path                       | Purpose                                                                   |
| -------------------------- | ------------------------------------------------------------------------- |
| `modules/`                 | Reusable Terraform modules (network, kubernetes, datastore, IAM patterns) |
| `environments/dev/`        | Dev root module / backend config entrypoint                               |
| `environments/staging/`    | Staging root module / backend config entrypoint                           |
| `environments/production/` | Production root module / backend config entrypoint                        |
| `global/`                  | Account-wide or org-level resources shared across environments            |

## What belongs here

- `.tf` modules and environment roots (when authored)
- Remote state backend configuration templates (no credentials)
- Variable interfaces and output contracts

## What does not belong here

- `*.tfstate`, provider credential files, or `.terraform/` caches (gitignored when introduced)
- Kubernetes app manifests (see `../kubernetes/`)
- Application runtime config belonging in app repos/packages
