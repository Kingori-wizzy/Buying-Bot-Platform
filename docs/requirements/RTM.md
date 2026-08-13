# Requirements Traceability Matrix (RTM)

| Requirement           | Use cases              | Domain          | ADR            | Design doc                  | Milestone      | Test category                    |
| --------------------- | ---------------------- | --------------- | -------------- | --------------------------- | -------------- | -------------------------------- |
| FR-AUTH-001–010       | UC-001–004             | Identity        | 0008           | security-design, SDS        | M4–M5          | unit, integration, e2e, security |
| FR-CAT-001–010        | UC-005–008,021,025     | Catalog         | 0010           | database-design, api-design | M6             | unit, integration, e2e           |
| FR-INV-001–006        | UC-012,022,035         | Inventory       | 0010/0011/0013 | database-design             | M7             | integration, concurrency         |
| FR-PRICE-001–013      | UC-019–020,027         | Pricing         | 0012           | SDS, api-design             | M8             | unit golden, integration         |
| FR-CART-001–002       | UC-009–010,036         | Cart            | 0011           | SDS                         | M9             | integration, e2e                 |
| FR-CHK-001 / FR-ORD-* | UC-011,016–017         | Checkout/Orders | 0011           | SDS                         | M10            | integration, e2e, security       |
| FR-PAY-* / FR-WH-001  | UC-013–015,018,030–031 | Payments        | 0011/0009      | integration-design          | M11–M12        | integration, webhook, security   |
| FR-FUL-* / FR-RET-*   | UC-033–035             | Fulfillment     | 0013           | SDS                         | post-M12 / ops | integration, e2e                 |
| FR-NOT-*              | (event-driven)         | Notifications   | 0014           | integration-design          | M18            | integration                      |
| FR-AI-*               | UC-025–029             | AI              | 0015           | ai-rag-design               | M15–M17        | unit, eval, security             |
| FR-API-*              | all API UCs            | API             | 0009           | api-design                  | M2+            | contract, integration            |
| NFR-SEC-*             | UC-002–004,014         | Security        | 0018           | security-design             | M4,M20         | security                         |
| NFR-PERF-*            | —                      | Platform        | 0009/0017      | observability, testing      | M21            | load                             |
| NFR-DR-*              | —                      | Ops             | 0019           | disaster-recovery-design    | M22            | DR drill                         |
| NFR-AVAIL-*           | —                      | Ops             | 0017           | observability-design        | M19            | chaos/resilience                 |
| BR-*                  | mapped UCs             | Cross           | various        | business-rules              | continuous     | regression                       |

## Coverage notes

- **Uncovered by code today:** Nearly all FR_* (foundation only) — expected.
- **Architecture without impl:** All ADR-0005–0020.
- **OPEN without ADR:** OPEN-001–005 in assumptions doc (vendor/legal/config).
- **No ADR conflict detected** against SRS in this baseline.
