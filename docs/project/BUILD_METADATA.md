# Build metadata template

Record release candidate provenance before promoting staging.

## Generate

From repository root (Node 22 on PATH):

```bash
pnpm run release:metadata
```

Writes `artifacts/BUILD_METADATA.json` (gitignored). Commit **this template**
only — never commit real secrets or environment-specific credentials.

## Expected fields

| Field         | Source                          |
| ------------- | ------------------------------- |
| `generatedAt` | UTC ISO timestamp               |
| `version`     | root `package.json` / `VERSION` |
| `gitSha`      | `git rev-parse HEAD`            |
| `gitBranch`   | current branch                  |
| `gitDescribe` | `git describe --tags --always`  |
| `nodeVersion` | `process.version`               |
| `platform`    | `process.platform`              |

## Operator checklist

- [ ] Metadata generated on clean working tree (or note dirty flag)
- [ ] Image tags match `gitSha` / semver tag pushed to GHCR
- [ ] Staging smoke PASS against target environment
- [ ] Integrity script PASS against staging DB
- [ ] EXTERNAL host verification recorded separately (do not invent)

## Example (illustrative shape)

See `artifacts/BUILD_METADATA.example.json`.
