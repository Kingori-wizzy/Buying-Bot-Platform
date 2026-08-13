# Compliance readiness (M24)

Engineering can implement technical controls; **legal and business approval**
remain EXTERNAL and are not claimed complete.

## TECHNICALLY IMPLEMENTED

| Area                                          | Notes                                                 |
| --------------------------------------------- | ----------------------------------------------------- |
| AuthN / session isolation (customer vs admin) | Cookie realms + CSRF                                  |
| AuthZ RBAC permission catalog                 | Seeded roles/permissions                              |
| Admin MFA (TOTP)                              | Required for admin ops                                |
| Audit schema foundation                       | `audit` schema present                                |
| Encryption of MFA secrets at rest             | AES-GCM helper                                        |
| Structured log redaction seams                | Logger / AI guardrails                                |
| Payment webhook idempotency                   | Outbox + webhook tests                                |
| Data backup scripts                           | `infrastructure/scripts/backup-postgres.*`            |
| Privacy-friendly defaults                     | Cookie Secure in staging/prod; HSTS when staging/prod |

## REQUIRES LEGAL / BUSINESS APPROVAL (EXTERNAL)

| Area                                     | Notes                                      |
| ---------------------------------------- | ------------------------------------------ |
| Privacy policy / terms of service        | Legal copy + counsel                       |
| Kenya DPA / data subject request process | Process + DPO                              |
| Tax rate configuration for live VAT      | Finance sign-off (`TAX_*`)                 |
| M-Pesa live shortcode / contract         | Vendor + treasury                          |
| Marketing consent / SMS opt-in           | Business + legal                           |
| PCI scope determination                  | Prefer redirect/STK; confirm with assessor |
| Retention / deletion SLAs                | Policy                                     |
| Insurance / merchant agreements          | Business                                   |

**Status:** Technical controls ready for staging review; **not** compliance-certified.
