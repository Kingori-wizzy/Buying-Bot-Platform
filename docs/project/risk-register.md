# Risk register

| ID    | Risk                      | P   | I   | Sev | Mitigation                                 | Contingency                            | Milestone  |
| ----- | ------------------------- | --- | --- | --- | ------------------------------------------ | -------------------------------------- | ---------- |
| R-001 | M-Pesa integration delays | M   | H   | H   | Early sandbox; PaymentProvider abstraction | Delay launch method; keep port         | M11        |
| R-002 | Inventory oversell        | M   | H   | H   | Reservations + constraints + tests         | Reconcile/refund                       | M7/M10     |
| R-003 | PG outage                 | L   | H   | H   | Managed HA; readiness fail                 | Fail traffic; restore                  | M3/M19     |
| R-004 | Redis outage              | M   | M   | M   | Outbox; PG SoT                             | Degrade cache; fail-closed auth limits | M3         |
| R-005 | Queue backlog             | M   | M   | M   | DLQ alerts; scale workers                  | Pause noncritical jobs                 | M12/M18    |
| R-006 | Webhook dup/spoof         | M   | H   | H   | HMAC + idempotency                         | Manual reconcile                       | M12        |
| R-007 | Auth compromise           | L   | H   | H   | MFA admin; lockout; audit                  | Rotate; force logout                   | M4–M5/M20  |
| R-008 | AI hallucination/pricing  | M   | H   | H   | Tools-only; eval tests                     | Disable AI feature flag                | M15–M17    |
| R-009 | Prompt injection          | M   | H   | H   | Allow-list tools; isolation                | Kill switch                            | M17/M20    |
| R-010 | Data leak via logs        | M   | H   | H   | Redaction; review                          | Rotate secrets                         | M19/M20    |
| R-011 | Search outage             | M   | L   | L   | Exact id + checkout continue               | Rebuild FTS                            | M6         |
| R-012 | Object storage outage     | M   | M   | M   | Degrade media                              | Retry uploads                          | M6         |
| R-013 | Perf regression           | M   | M   | M   | Load tests M21                             | Scale/cache                            | M21        |
| R-014 | Dependency CVE            | M   | M   | M   | audit/Dependabot                           | Patch/rollback                         | continuous |
| R-015 | Bad deploy                | M   | H   | H   | Gated deploy; rollback images              | Revert                                 | M23–M25    |
| R-016 | Backup/restore failure    | M   | H   | H   | Mandatory drills M22                       | Delay payments go-live                 | M22        |
| R-017 | Vendor lock-in            | L   | M   | M   | Ports/adapters                             | Swap adapter                           | 0016       |
| R-018 | Scope creep marketplace   | H   | M   | M   | ADR boundaries                             | Park future ADR                        | all        |
| R-019 | Tax config wrong          | M   | H   | H   | Fail closed; finance review                | Halt checkout                          | M8         |
| R-020 | Late pay after expiry     | M   | H   | H   | Reconciliation hold                        | Ops refund/allocate                    | M12        |

P/I = L/M/H. Owner roles: Eng lead / Security / Ops as applicable.
