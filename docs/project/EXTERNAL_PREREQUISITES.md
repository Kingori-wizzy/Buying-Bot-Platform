# External prerequisites

Only items that **cannot** be completed inside this repository. Do not invent credentials, domains, certificates, or legal approvals.

## Accounts / infrastructure

| Item                                          | Why it is external                                        |
| --------------------------------------------- | --------------------------------------------------------- |
| Hostinger VPS                                 | Hardware/network is purchased and operated by the company |
| DNS (Cloudflare or registrar)                 | Domain ownership                                          |
| TLS certificates (Let’s Encrypt / Cloudflare) | Issued after DNS exists                                   |
| GitHub Environment `production` + SSH secrets | Org/repo access                                           |
| Offsite backup destination                    | Object storage / S3 / encrypted USB policy                |

## Payments

| Item                                             | Notes                                   |
| ------------------------------------------------ | --------------------------------------- |
| Escrow API key, secret, base URL, webhook secret | Required before `PAYMENTS_ENABLED=true` |
| Provider webhook allowlist to production API     | Provider console                        |

M-Pesa customer checkout is **out of scope**. Do not treat Daraja keys as a launch requirement.

## Catalog / content

| Item                                        | Notes                             |
| ------------------------------------------- | --------------------------------- |
| Subcategories under the five roots          | Admin-created                     |
| Product names, descriptions, images, prices | Company-approved only             |
| Fulfillment delivery content policy         | What customers receive after PAID |

## Optional providers

| Item                                  | Notes                          |
| ------------------------------------- | ------------------------------ |
| OpenAI / Anthropic / Ollama host      | AI quality; shop works without |
| SMTP / SMS / WhatsApp                 | Notifications                  |
| `age` recipient for encrypted backups | Backup encryption              |

## Legal / assurance

| Item                                   | Notes           |
| -------------------------------------- | --------------- |
| Privacy policy / ToS                   | Counsel         |
| Kenya DPA process                      | Counsel         |
| Formal penetration test                | Security vendor |
| Finance sign-off to enable live Escrow | Risk            |

## Explicit non-claims

This repository does not include live production secrets, purchased domains, signed contracts, or a restored-on-Hostinger backup drill.
