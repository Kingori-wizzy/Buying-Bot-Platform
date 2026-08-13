# Security incident runbook

## Triggers

Credential leak, suspected account takeover, CSRF bypass, malware on admin host,
anomalous admin MFA resets.

## First actions

1. Rotate `SESSION_SECRET`, `SERVICE_JWT_SECRET`, DB passwords, API keys.
2. Invalidate sessions (DB session revoke / cookie secret rotate forces re-login).
3. Disable compromised admin users; require MFA re-enroll.
4. Preserve logs/metrics; do not wipe evidence.
5. Scan git history / GHCR if secret committed — follow `SECURITY.md` disclosure.

## EXTERNAL

- Vault/secrets manager rotation procedures
- Legal notification thresholds
- Formal forensics / pen-test follow-up

## References

- [SECURITY_AUDIT_M24.md](../../Security/SECURITY_AUDIT_M24.md)
- [incident-response.md](./incident-response.md)
