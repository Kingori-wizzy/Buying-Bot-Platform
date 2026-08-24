# ADR-0018: Security, privacy, compliance, and audit architecture

- Status: **Accepted**
- Date: 2026-08-13
- Deciders: Platform Architecture; accepted by architecture program review on
  2026-08-13
- Aligns with: ADR-0005–ADR-0017 (**Accepted**), especially ADR-0008
- Scope: Threat model, trust boundaries, AuthN/Z, data protection, audit,
  privacy controls, AI/security, SDLC security
- Out of scope: Claiming Kenya Data Protection Act certification; PCI SAQ
  completion; implementing controls in code in this ADR

## 1. Context / Problem

Commerce + identity + payments + AI require a unified security architecture
without pretending legal compliance is done.

## 2. Goals / Non-goals

**Goals:** defense in depth; least privilege; auditability; PII minimization;
clear tech vs legal boundary.

**Non-goals:** asserting regulatory compliance; storing card PAN.

## 3. Trust boundaries

```text
Browser (untrusted)
  → Next.js web/admin (presentation; separate realms ADR-0007/0008)
    → NestJS API (AuthN/Z authority)
      → Domain/Application
        → PostgreSQL / Redis / Object storage / Providers
apps/ai-service (service identity; tools only)
apps/worker (service identity; no public AuthZ bypass)
```

## 4. Principal tiers

| Principal           | Auth                            | Trust            | Notes                      |
| ------------------- | ------------------------------- | ---------------- | -------------------------- |
| Customer            | Session/cookie or mobile bearer | Low              | Own resources only         |
| Staff               | Admin realm + MFA               | Medium           | RBAC permissions           |
| Admin / Super-admin | MFA + step-up                   | High             | Privileged actions audited |
| Service             | Short-lived service JWT         | High constrained | Audience-scoped            |
| AI service          | Service JWT + user delegation   | Constrained      | Tools re-AuthZ             |

## 5. Controls (technical)

- AuthN/Z per ADR-0008 (sessions, MFA admin, RBAC, ownership, tenants)
- CSRF/CORS/rate limits per ADR-0008/0009
- Input validation Zod; parameterized SQL; output encoding
- IDOR prevention via server scoping
- Webhook HMAC + replay protection
- Secrets in secret store (ADR-0019); encryption in transit (TLS); at-rest
  via platform disk/KMS for PG/object storage
- Passwords Argon2id; no plaintext
- No PAN/CVV/PIN storage; provider tokens only
- Supply chain: lockfile, CI audit, image scan (ADR-0019/0020)
- AI: prompt injection defenses, no direct DB, no invented money
  (ADR-0015)

## 6. Privacy

- PII minimization; purpose limitation in design
- Account deletion/anonymization vs financial retention (ADR-0006/0011)
- Export/access requests = **process + legal review**; architecture supports
  data inventory
- Consent for marketing (ADR-0014)
- **Do not claim** Kenya DPA / GDPR compliance until counsel verifies

## 7. Audit

Append-only security and commerce audit in PostgreSQL: logins, privilege
changes, payment/refund, fulfillment overrides, AI high-risk tools,
admin actions. Tamper-resistant operationally (append-only access).

## 8. Threat model (summary)

Credential stuffing, session theft, IDOR, payment webhook forgery, coupon
abuse, return fraud, XSS/CSRF, prompt injection, supply-chain malware —
mitigations mapped in ADR-0008–0016.

## 9. Incident response

Detect (ADR-0017) → contain → eradicate → recover → notify per legal
advice. Break-glass admin access audited.

## 10. Alternatives rejected

Security by obscurity; shared web/admin cookies; AI with DB credentials;
logging secrets “temporarily”.

## 11. Future / legal

Formal DPIA, PCI scope validation, data residency choices — **legal +
compliance track**, not silently asserted here.

## 12. Decision status

**Accepted.** Indexed in [DECISIONS.md](../DECISIONS.md).
