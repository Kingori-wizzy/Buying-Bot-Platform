# Dependency map

## ADR → domain → package → app

| ADR | Domain | Package contracts | Primary apps |
| --- | --- | --- | --- |
| 0005 | HTTP API | — | api |
| 0006 | Data | database, config | api, worker |
| 0007 | UI | ui, sdk | web, admin, docs |
| 0008 | Identity | auth, types | api, web, admin |
| 0009 | API/comms | sdk, validation, types | api, sdk consumers |
| 0010 | Catalog/inv | types, validation | api, worker, web, admin |
| 0011 | Commerce | types, validation | api, worker, web |
| 0012 | Pricing | validation | api |
| 0013 | Fulfillment | types | api, worker, admin |
| 0014 | Notify | — | worker, api |
| 0015 | AI | ai-core | ai-service, api, worker |
| 0016 | Integrations | — | api, worker |
| 0017 | Observability | logging/utils | all |
| 0018 | Security | auth | all |
| 0019 | Infra | — | infrastructure/, CI |
| 0020 | QA | — | CI |

## Critical path dependencies

Identity before admin catalog writes; Offer before cart; calculation before
checkout; payments before PAID fulfillment; outbox before reliable provider
calls; OpenAPI before SDK growth.
