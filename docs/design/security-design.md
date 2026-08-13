# Security design

**Aligns with:** ADR-0008, 0018, 0009, 0015

## Threat model (summary)

Credential stuffing, session theft, IDOR, CSRF/XSS, webhook forgery, coupon
abuse, return/refund abuse, prompt injection, supply-chain risk.

## Controls

| Area            | Control                                    | Status vs repo                          |
| --------------- | ------------------------------------------ | --------------------------------------- |
| AuthN           | Sessions, cookies, MFA admin               | IMPLEMENTED (M4–M5)                     |
| AuthZ           | RBAC + ownership                           | PARTIALLY IMPLEMENTED (guards + helper) |
| CSRF/CORS       | SameSite + tokens/origin; no wildcard prod | IMPLEMENTED                             |
| Rate limit      | Redis-backed (+ in-memory fail-closed)     | PARTIALLY IMPLEMENTED (auth routes)     |
| Passwords       | Argon2id                                   | IMPLEMENTED                             |
| Webhooks        | HMAC + replay                              | PLANNED                                 |
| Secrets         | env/secret manager; not in git             | PARTIAL (.env.example, gitleaks)        |
| Payments        | No PAN; tokens only                        | DECIDED                                 |
| AI              | Tools only; no DB                          | DECIDED                                 |
| Audit           | PG append-only                             | PARTIALLY IMPLEMENTED (SecurityEvent)   |
| Headers/CSP     | Helmet on API; full CSP later              | PARTIAL                                 |
| Ops health auth | Public health live                         | IMPLEMENTED                             |

## Classification

- **IMPLEMENTED:** Nest+Fastify API, sessions/cookies, CSRF/CORS, Argon2id,
  admin TOTP MFA, RBAC guards, service JWT foundation, identity Prisma schema
- **PARTIALLY IMPLEMENTED:** rate limits (auth paths), ownership helper,
  security event audit, Helmet without full CSP product policy
- **PLANNED:** webhooks, broader abuse controls, OTel
- **DEFERRED:** full WAF, advanced fraud

Legal compliance: **not claimed**.
