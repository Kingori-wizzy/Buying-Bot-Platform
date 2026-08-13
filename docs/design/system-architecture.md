# System architecture

**Aligns with:** ADR-0001–0020, ARCHITECTURE.md, ARCHITECTURE_DECISION_MATRIX.md

## Deployables

| App        | Role                         |
| ---------- | ---------------------------- |
| web        | Customer storefront          |
| admin      | Operations UI                |
| api        | System of record HTTP API    |
| worker     | Async jobs                   |
| ai-service | Model/RAG/tool orchestration |
| docs       | Publishable docs site        |

## Shared packages (selected)

auth, types, validation, config, database, sdk, ui, ai-core, utils, logging.

## Source of truth

PostgreSQL = transactional SoT. Redis/BullMQ/object storage/search indexes =
coordination, transport, blobs, derived indexes.

## Trust path

Browser → Next → API (authority) → Domain → Infrastructure / Providers.
