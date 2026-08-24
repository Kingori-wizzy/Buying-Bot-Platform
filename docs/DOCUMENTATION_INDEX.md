# Documentation index (authoritative)

This is the **map of which document is source of truth**. Duplicate historical reports were removed or superseded.

**Current product:** admin-controlled digital products shop + AI assistant + cart/checkout + Escrow + digital fulfillment. PostgreSQL is catalog SoT. Marketplace ingestion and M-Pesa checkout are deferred.

## Hierarchy

```text
docs/
├── README.md                          ← start here
├── DOCUMENTATION_INDEX.md             ← this file
├── ARCHITECTURE.md                    ← current system architecture
├── PRODUCTION_READINESS.md            ← readiness checklist (points to final report)
├── DECISIONS.md                       ← ADR index
├── requirements/                      ← SRS, use cases, RTM
├── design/                            ← SDS + domain designs
├── adr/                               ← accepted ADRs
├── project/                           ← status reports (few, current)
├── Deployment/                        ← Hostinger + ops
├── runbooks/                          ← operator procedures
├── Security/                          ← audits / hardening
└── developer/                         ← local getting started
```

## One document per subject

| Subject                               | Authoritative document                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Architecture                          | [ARCHITECTURE.md](./ARCHITECTURE.md)                                                               |
| Digital catalog                       | [design/DIGITAL_PRODUCT_CATALOG_ARCHITECTURE.md](./design/DIGITAL_PRODUCT_CATALOG_ARCHITECTURE.md) |
| Database / SDS                        | [design/SDS.md](./design/SDS.md), [design/database-design.md](./design/database-design.md)         |
| API design                            | [design/api-design.md](./design/api-design.md)                                                     |
| Security design                       | [design/security-design.md](./design/security-design.md)                                           |
| AI/RAG                                | [design/ai-rag-design.md](./design/ai-rag-design.md)                                               |
| Product sources (deferred)            | [design/PRODUCT_SOURCE_ARCHITECTURE.md](./design/PRODUCT_SOURCE_ARCHITECTURE.md)                   |
| ADRs                                  | [adr/](./adr/), [DECISIONS.md](./DECISIONS.md)                                                     |
| Requirements                          | [requirements/SRS.md](./requirements/SRS.md), [requirements/RTM.md](./requirements/RTM.md)         |
| Final implementation / classification | [project/FINAL_IMPLEMENTATION_REPORT.md](./project/FINAL_IMPLEMENTATION_REPORT.md)                 |
| External prerequisites                | [project/EXTERNAL_PREREQUISITES.md](./project/EXTERNAL_PREREQUISITES.md)                           |
| Launch checklist                      | [project/PRODUCTION_LAUNCH_CHECKLIST.md](./project/PRODUCTION_LAUNCH_CHECKLIST.md)                 |
| Hostinger deploy                      | [Deployment/HOSTINGER_DEPLOYMENT_RUNBOOK.md](./Deployment/HOSTINGER_DEPLOYMENT_RUNBOOK.md)         |
| GitHub Actions + secrets              | [Deployment/GITHUB_ACTIONS_AND_SECRETS.md](./Deployment/GITHUB_ACTIONS_AND_SECRETS.md)             |
| Escrow ops                            | [Deployment/ESCROW_CONFIGURATION.md](./Deployment/ESCROW_CONFIGURATION.md)                         |
| Backups                               | [Deployment/BACKUP_RESTORE.md](./Deployment/BACKUP_RESTORE.md)                                     |
| Admin catalog ops                     | [runbooks/ADMIN_PRODUCT_MANAGEMENT.md](./runbooks/ADMIN_PRODUCT_MANAGEMENT.md)                     |
| Digital fulfillment ops               | [runbooks/DIGITAL_FULFILLMENT.md](./runbooks/DIGITAL_FULFILLMENT.md)                               |
| Developer setup                       | [developer/getting-started.md](./developer/getting-started.md)                                     |

## Historical / retained for audit

Milestone completion logs: [project/M15-M22-COMPLETION.md](./project/M15-M22-COMPLETION.md), M24 security/reliability notes under `docs/Security/` and `docs/project/*_M24.md`.

Do not treat marketplace “real market catalog” reports as the current shop model.
