# Assumptions, constraints, and open items

## Assumptions (ASSUMED)

| ID        | Statement                                                      |
| --------- | -------------------------------------------------------------- |
| ASSUM-001 | Launch market is Kenya; primary language English.              |
| ASSUM-002 | Single merchant organization at launch.                        |
| ASSUM-003 | M-Pesa is the first live payment method.                       |
| ASSUM-004 | Foundation RPO≤24h / RTO≤4h until payment go-live tightens DR. |

## Constraints (DECIDED via ADR)

| ID      | Constraint                                      | ADR            |
| ------- | ----------------------------------------------- | -------------- |
| CON-001 | PostgreSQL is commerce SoT; Redis is not ledger | 0006           |
| CON-002 | Integer money; no float financial math          | 0012           |
| CON-003 | AI no direct DB/Redis/SQL                       | 0015           |
| CON-004 | Client totals never authoritative               | 0011/0012      |
| CON-005 | Containers before Kubernetes for v1             | 0019           |
| CON-006 | No card PAN/CVV/PIN storage                     | 0008/0011/0018 |

## Open (OPEN — need business/legal/vendor)

| ID       | Question                             | Impact                   |
| -------- | ------------------------------------ | ------------------------ |
| OPEN-001 | Exact Kenya VAT configuration values | TaxCalculator config     |
| OPEN-002 | Courier vendor selection             | DeliveryProvider adapter |
| OPEN-003 | SMS/Email/WhatsApp vendors           | Notification adapters    |
| OPEN-004 | Legal compliance attestation timing  | Launch gate              |
| OPEN-005 | PCI scope if/when cards launch       | Payments                 |

## Deferred (DEFERRED)

| ID      | Item                     | Future ADR/milestone   |
| ------- | ------------------------ | ---------------------- |
| DEF-001 | Multi-seller settlements | Marketplace ADR        |
| DEF-002 | Dedicated search engine  | When FTS limits proven |
| DEF-003 | Kubernetes               | When scale evidence    |
| DEF-004 | Fraud/risk engine        | Future ADR             |
| DEF-005 | Customer pickup network  | Future ADR             |
