# External prerequisites

Items that **cannot** be completed inside this repository alone.  
Do not invent credentials, DNS, SSL, vendor contracts, or legal approvals.

## TECHNICAL — CAN COMPLETE LOCALLY (done or scripted)

| Item                                                | Status   |
| --------------------------------------------------- | -------- |
| Staging Compose + nginx + Dockerfiles               | VERIFIED |
| Env validation fail-fast / production secret refine | VERIFIED |
| Smoke / integrity / security gate scripts           | VERIFIED |
| Migrations + pgvector + FTS                         | VERIFIED |
| Backup/restore scripts + local restore drill        | VERIFIED |
| GHCR build workflow (no auto prod deploy)           | VERIFIED |
| AI degradation without AI process                   | VERIFIED |

## EXTERNAL — REQUIRES ACCOUNT / RESOURCE

| Item                          | Config / location             | Verification             |
| ----------------------------- | ----------------------------- | ------------------------ |
| Staging/production host       | Compose on VM                 | `DEPLOYMENT_RUNBOOK`     |
| DNS A/AAAA records            | Edge DNS                      | HTTPS resolves           |
| TLS certificates              | nginx / LB                    | Browser padlock          |
| Secrets manager               | Inject `.env.production`      | Boot without git secrets |
| GHCR pull on host             | `docker login ghcr.io`        | Image pull               |
| M-Pesa Daraja keys + callback | `MPESA_*`, `PAYMENTS_ENABLED` | Sandbox STK then live    |
| SMTP / SMS / WhatsApp         | Notification adapters         | Test intent delivery     |
| AI vendor keys / Ollama host  | `OPENAI_API_KEY` etc.         | Non-deterministic chat   |
| Object storage                | Media/backups                 | Upload + restore         |
| Managed Postgres PITR         | Cloud PG                      | Point-in-time restore    |
| OTel collector + Alertmanager | Monitoring stack              | Alerts fire              |
| WAF / CDN                     | Edge                          | OPTIONAL                 |

## BUSINESS — REQUIRES HUMAN DECISION

| Item                      | Notes                   |
| ------------------------- | ----------------------- |
| Enable live payments      | Finance + risk sign-off |
| Tax rate BPS for live VAT | Finance                 |
| Shipping rates / couriers | Ops                     |
| Support / refund policy   | Ops                     |
| Merchant agreements       | Legal/biz               |

## LEGAL — REQUIRES APPROVAL

| Item                     | Notes                                |
| ------------------------ | ------------------------------------ |
| Privacy policy / ToS     | Counsel                              |
| Kenya DPA process        | Counsel                              |
| PCI scope if cards later | Counsel (M-Pesa first reduces scope) |
| Formal penetration test  | Security vendor                      |

## Explicit non-claims

This repository does **not** include live production credentials, purchased
domains, signed legal documents, or fabricated EXTERNAL verification.
