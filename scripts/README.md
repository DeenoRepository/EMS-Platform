# Scripts catalog

Scripts are grouped by operational purpose. A script not referenced by the
application is not necessarily unused: deployment, migration, import, and
maintenance commands are intentionally manual entry points.

## Quality and security gates

The following scripts are deterministic CI/project checks. They need no
database connection and no production credentials, but see the prerequisites
below — `pnpm test` does require generated Prisma client types.

| Script | Purpose | Usage |
|---|---|---|
| [`check-quality-baseline.mjs`](check-quality-baseline.mjs) | Quality gate and generated quality report | `node scripts/check-quality-baseline.mjs [--report]` |
| [`check-doc-links.mjs`](check-doc-links.mjs) | Verify local Markdown links resolve to real files | `node scripts/check-doc-links.mjs` |
| [`check-theme-tokens.mjs`](check-theme-tokens.mjs) | Detect hardcoded UI hex colors | `node scripts/check-theme-tokens.mjs` |
| [`plans-index.mjs`](plans-index.mjs) | Validate story front-matter and generate plans index | `node scripts/plans-index.mjs [--check]` |
| [`route_audit.py`](route_audit.py) | Audit API route rate-limit/auth patterns | `python scripts/route_audit.py [--report]` |
| [`test-runner.mjs`](test-runner.mjs) | Run repository TypeScript tests through Node's loader | `pnpm test` |
| [`fgrade_detail.py`](fgrade_detail.py) | Print detailed F-grade file list | `python scripts/fgrade_detail.py` |

### Prerequisites before running the gates

```bash
pnpm install --frozen-lockfile
pnpm db:generate   # required by pnpm test
```

`pnpm db:generate` only generates Prisma client types from
`packages/database/prisma/schema.prisma`; it does not connect to or modify a
database. Skipping it makes every suite that imports `@ems/database` abort with
`@prisma/client did not initialize yet`, which is an environment error and not
a test regression. CI performs the same step ("Generate Prisma Client" in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) before linting and
testing.

`inspect_summary.py` was removed: its output duplicated the generated quality
baseline and it had no callers.

## Deployment and operations

| Script group | Purpose |
|---|---|
| `prod-deploy.sh` / `prod-deploy.ps1` | Production Docker deployment |
| `airgap-pack.sh` / `airgap-pack.ps1` | Build a Docker offline bundle |
| `airgap-install.sh` / `airgap-install.ps1` | Install the Docker offline bundle |
| `baremetal-pack.sh` / `baremetal-pack.ps1` | Build a no-Docker release bundle |
| `baremetal-install.sh` / `baremetal-install.ps1` | Install the no-Docker release |
| `backup.sh` / `backup.ps1` | Database and uploads backup |

Detailed instructions: [`docs/README.md`](../docs/README.md).

## Data import and maintenance

These scripts are manual, data-sensitive tools. Run them only with a verified
backup, the correct input files under the ignored `temp/` directory, and the
intended database selected in the environment:

| Script | Purpose |
|---|---|
| [`convert_petrov_equipment.py`](convert_petrov_equipment.py) | Convert the Petrov equipment workbook to EPS CSV |
| [`import-full-equipment-and-docs.js`](import-full-equipment-and-docs.js) | Import equipment and related documents |
| [`import-wms-from-dwms.js`](import-wms-from-dwms.js) | Import WMS data from a DWMS dump |
| [`fix-wms-unnamed-nomenclature.js`](fix-wms-unnamed-nomenclature.js) | Repair unnamed WMS nomenclature from a DWMS dump |
| [`sync-uploaded-documents.js`](sync-uploaded-documents.js) | Link files in `uploads/` to equipment records |
| [`clear-mol.js`](clear-mol.js) | Remove/normalize MOL values in EPS (destructive maintenance command) |

The obsolete `sync-legacy-import.js` wrapper and direct SQL feedback migration
were removed. Schema changes must go through the Prisma schema and the
repository's database migration workflow.

## Generated reports and the `Measured at:` date

[`check-quality-baseline.mjs --report`](check-quality-baseline.mjs) and
[`route_audit.py --report`](route_audit.py) write generated Markdown that CI
regenerates and then verifies with `git diff --exit-code`. Both keep the
`Measured at:` date of the previous report when regeneration produces
otherwise-identical content, and advance it only when a measured value
actually changed. Do not "simplify" this back to an unconditional
`today()` — that reintroduces a build failure on every day after the last
commit, even with no code change.

## Maintenance policy

- Add any new script to this catalog in the same commit.
- A generated report must be byte-identical when regenerated from unchanged
  inputs; never embed a wall-clock timestamp that varies per run.
- Every script must document required inputs, target environment, and whether
  it mutates the database or filesystem.
- Keep generated reports in `docs/quality/`; keep temporary inputs in ignored
  `temp/`; never commit secrets, dumps, archives, or uploaded files.
