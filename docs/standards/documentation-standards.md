# Documentation standards

**Aligns with:** [ARCHITECTURE.md](../ARCHITECTURE.md) §3 Principle 6, §8 Evolution model

Documentation is a first-class deliverable. If behavior, contracts, or architecture change, docs change in the same PR.

## Document hierarchy

| Tier                             | Location                                                           | Authority                                |
| -------------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| 1. Enterprise Architecture       | [docs/ARCHITECTURE.md](../ARCHITECTURE.md), [`docs/EAD/`](../EAD/) | System topology and principles           |
| 2. Requirements & design volumes | `docs/BRS/`, `SRS/`, `SDS/`, `AIDS/`, `IDS/`, `IDDS/`              | What/how specifications (authored later) |
| 3. Domain catalogs               | `docs/API/`, `Database/`, `Security/`, `Testing/`, `Deployment/`   | Specialty documentation sets             |
| 4. Decisions (ADRs)              | [docs/DECISIONS.md](../DECISIONS.md), [`docs/adr/`](../adr/)       | Why choices were made                    |
| 5. Standards                     | `docs/standards/*`                                                 | Normative engineering rules              |
| 6. Operational catalogs          | `docs/code-quality.md`, `docs/github.md`                           | Exact tool/file inventories              |
| 7. Contribution & trust          | root `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`        | How humans interact with the repo        |
| 8. Package READMEs               | `packages/*/README.md`, future `apps/*/README.md`                  | Local usage for that package/app         |

When documents conflict, higher tiers win after an ADR updates them.

## What goes where

| Content                                | Put it in                      |
| -------------------------------------- | ------------------------------ |
| Platform principles, app boundaries    | `ARCHITECTURE.md`              |
| A significant irreversible choice      | New ADR + `DECISIONS.md` index |
| Branch / version / coding / docs rules | `docs/standards/`              |
| ESLint/Prettier/Husky file catalog     | `docs/code-quality.md`         |
| Issue templates, CI steps              | `docs/github.md`               |
| How to set up and open a PR            | `CONTRIBUTING.md`              |
| Vulnerability reporting                | `SECURITY.md`                  |
| Package scripts and exports            | That package’s `README.md`     |

Do not duplicate long catalogs across files—link instead.

## Writing rules

1. **Audience first** — State who the doc is for near the top.
2. **Normative language** — Use must/should/may deliberately (RFC 2119 style).
3. **Align explicitly** — Standards docs must link to `ARCHITECTURE.md` (and ADR when applicable).
4. **Prefer tables and checklists** for procedures; keep prose short.
5. **No secrets** — Examples use placeholders (`CHANGE_ME`, `YOUR_TOKEN`).
6. **No stale scaffolds** — Do not document APIs or apps that do not exist yet as if they do.
7. **Update in the same PR** as the change; PR template checklist enforces this.
8. **American English** spelling for product docs unless a locale pack says otherwise.
9. **Markdown only** in-repo; generated sites may be added later via ADR.
10. **Format with Prettier** (`pnpm format`) before merge.

## Required sections for new app/package READMEs

When an app or package is created, its README must include:

1. Purpose (one paragraph)
2. Ownership / CODEOWNERS path
3. Setup commands
4. Scripts (`dev`, `build`, `test`, `typecheck`, `lint` as applicable)
5. Configuration / env vars (with `.env.example`, never real secrets)
6. Links to relevant ADRs and architecture sections

## Architecture diagrams

- Prefer Mermaid in Markdown for durable, reviewable diagrams.
- Every diagram needs a one-sentence caption of what decision it supports.
- Keep diagrams synchronized when topology changes.

## ADR documentation rules

Follow [DECISIONS.md](../DECISIONS.md). Accepted ADRs are immutable except for status updates (`Deprecated` / `Superseded`); corrections that change meaning require a new ADR.

## Review bar for documentation PRs

- [ ] Correct tier/location
- [ ] Links to `ARCHITECTURE.md` where normative
- [ ] No contradictory guidance vs ADRs
- [ ] Placeholders for org-specific values called out
- [ ] `pnpm format:check` passes
