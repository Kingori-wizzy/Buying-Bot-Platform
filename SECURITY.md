# Security policy

**Aligns with:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) §7 Security architecture  
**Repository:** [Kingori-wizzy/Buying-Bot-Platform](https://github.com/Kingori-wizzy/Buying-Bot-Platform)

The Buying Bot Platform will process commerce and potentially personal data. Security reports are handled privately and with priority.

## Supported versions

| Version / branch                     | Supported                            |
| ------------------------------------ | ------------------------------------ |
| `main`                               | Yes — actively maintained            |
| Tagged app releases (when published) | Latest minor of each supported major |
| Unreleased topic branches            | Best effort only                     |

Until the first production release, security fixes land on `main`.

## How to report a vulnerability

**Do not** open a public GitHub issue for security vulnerabilities.

Report privately using one of:

1. **GitHub Security Advisories** (preferred):  
   https://github.com/Kingori-wizzy/Buying-Bot-Platform/security/advisories/new
2. **Email:** kingorijoseph898@gmail.com

Include:

- Description of the issue and impact
- Reproduction steps or proof of concept (non-destructive)
- Affected component (`apps/*`, `packages/*`, CI, docs tooling, etc.)
- Any known workarounds

You should receive an acknowledgement within **3 business days**. We will keep you informed of the remediation plan.

## Safe harbor

We consider good-faith research conducted without privacy violations, service disruption, or data exfiltration to be authorized for the purpose of reporting. Do not:

- Access or modify other users’ data
- Degrade service availability (including load testing without permission)
- Social-engineer staff or customers
- Require payment or threaten disclosure

## Repository security baseline

Contributors must follow:

- No secrets, tokens, private keys, or production credentials in git
- Use `.env.example` (never commit real `.env`) when apps introduce configuration
- Least-privilege CI permissions (see [docs/github.md](./docs/github.md))
- Review high/critical dependency advisories promptly (`pnpm audit` in CI)
- Quality gates in [docs/standards/coding-standards.md](./docs/standards/coding-standards.md)

## Disclosure policy

- Fixes are developed privately when needed.
- We coordinate public disclosure after a fix is available or risk is accepted by maintainers.
- Credit will be given to reporters who wish to be named, unless anonymity is requested.
