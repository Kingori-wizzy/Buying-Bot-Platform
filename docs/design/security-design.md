# Security design

**Aligns with:** ADR-0008, 0018, 0009, 0015

## Threat model (summary)

Credential stuffing, session theft, IDOR, CSRF/XSS, webhook forgery, coupon
abuse, return/refund abuse, prompt injection, supply-chain risk.

## Controls

| Area            | Control                                    | Status vs repo                   |
| --------------- | ------------------------------------------ | -------------------------------- |
| AuthN           | Sessions, cookies, MFA admin               | PLANNED (contracts exist)        |
| AuthZ           | RBAC + ownership                           | PLANNED                          |
| CSRF/CORS       | SameSite + tokens/origin; no wildcard prod | PARTIAL (CORS guard in config)   |
| Rate limit      | Redis-backed                               | PLANNED                          |
| Passwords       | Argon2id                                   | PLANNED                          |
| Webhooks        | HMAC + replay                              | PLANNED                          |
| Secrets         | env/secret manager; not in git             | PARTIAL (.env.example, gitleaks) |
| Payments        | No PAN; tokens only                        | DECIDED                          |
| AI              | Tools only; no DB                          | DECIDED                          |
| Audit           | PG append-only                             | PLANNED                          |
| Headers/CSP     | Planned on product HTTP                    | PLANNED                          |
| Ops health auth | Public health live                         | IMPLEMENTED (ops shell)          |

## Classification

- **IMPLEMENTED:** foundation config/logging/health/CI secret scan
- **PLANNED:** product auth, RBAC, webhooks, rate limits
- **DEFERRED:** full WAF, advanced fraud

Legal compliance: **not claimed**.
