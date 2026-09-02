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
| [`check-static-security-policies.mjs`](check-static-security-policies.mjs) | Enforce named security policies for env, Compose, migrations, startup wiring, and other non-ESLint files | `node scripts/check-static-security-policies.mjs` (also part of `pnpm lint`) |
| [`eslint-rules/`](eslint-rules/) | Local named ESLint rules for API-route console, rate-limit, safe-error, and route-specific security policies | Loaded by `apps/web` lint via `--rulesdir` |
| [`plans-index.mjs`](plans-index.mjs) | Validate story front-matter and generate plans index | `node scripts/plans-index.mjs [--check]` |
| [`route_audit.py`](route_audit.py) | Audit API route rate-limit/auth patterns | `python scripts/route_audit.py [--report]` |
| [`test-runner.mjs`](test-runner.mjs) | Run repository TypeScript tests through Node's loader | `pnpm test` or `node scripts/test-runner.mjs --coverage` |
| [`check-coverage.mjs`](check-coverage.mjs) | Measure and gate Node loaded-line coverage, Node file reach, and Vitest component line coverage | `node scripts/check-coverage.mjs [--report]` |
| [`check-component-test-discovery.mjs`](check-component-test-discovery.mjs) | Fail when Vitest configuration matches fewer component test files than the recorded floor | Invoked by `pnpm --filter @ems/web test:components` |
| [`check-route-test-coverage.mjs`](check-route-test-coverage.mjs) | Fail when a production API route has no executable Node test import | Invoked automatically before `pnpm test`; also runnable directly |
| `apps/web/e2e/*.spec.ts` (Playwright) | E2E smoke tests: login/logout, EPS/WMS/MRO access, RBAC denial, equipment creation | `pnpm --filter @ems/web exec playwright test` |
| [`fgrade_detail.py`](fgrade_detail.py) | Print detailed F-grade file list | `python scripts/fgrade_detail.py` |

### Prerequisites before running the gates

Use the exact Node.js version declared in [`.nvmrc`](../.nvmrc). CI reads
the same file. This is especially important for `check-coverage.mjs`, because
Node's experimental coverage-table format changes across major versions.

```bash
nvm use
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

### Обязанность покрывать новый код тестами

Этот раздел описывает, **как** запускать и размещать тесты. Требование
**писать** их для всего нового кода с поведением, критерий пригодности
теста и оси покрытия для write-роутов — в
[`.agents/rules/testing.md`](../.agents/rules/testing.md).

### Test file co-location convention

Test files (`*.test.ts`, `*.test.tsx`) may live either:

* **next to the module they test** — e.g. `apps/web/src/lib/foo.ts` →
  `apps/web/src/lib/foo.test.ts`; or
* **in a `__tests__/` directory** — e.g.
  `apps/web/src/lib/__tests__/foo.test.ts`.

Both patterns are discovered automatically by
[`test-runner.mjs`](test-runner.mjs), which scans `packages/` and
`apps/web/src/` recursively while excluding `node_modules`, `.next`, `dist`,
`.turbo`, and `e2e/`. Adding a new test file anywhere within those roots is
sufficient; no registration or manifest update is needed. Before test discovery,
[`check-route-test-coverage.mjs`](check-route-test-coverage.mjs) verifies that
all `apps/web/src/app/api/**/route.ts` files are imported by an executable
`*.test.ts` suite.

E2E specs (`apps/web/e2e/**/*.spec.ts`) are intentionally excluded: they
require a live PostgreSQL instance and a production build, and are run via a
separate Playwright command (see §E2E smoke tests above).

### E2E smoke tests (Playwright)

Isolated from the gates above: not part of `pnpm test`, and not currently a
required CI step (see
[`plans/done/2026-08/L4-e2e-smoke-coverage.md`](../plans/done/2026-08/L4-e2e-smoke-coverage.md)
for why — the suite must first prove stability over time before it gates merges).

```bash
pnpm --filter @ems/database generate
pnpm build                                # tests run against the production build
pnpm --filter @ems/web exec playwright install chromium
pnpm --filter @ems/web exec playwright test
```

Requires a reachable local PostgreSQL server (default
`postgresql://postgres:postgres@localhost:5432`, override with
`E2E_DB_HOST`/`E2E_DB_PORT`/`E2E_DB_USER`/`E2E_DB_PASSWORD`). The suite's
`apps/web/e2e/global-setup.ts` provisions and migrates its own ephemeral
`ems_e2e_test` database on that server — it never touches a developer's dev
database or any production data — and `global-teardown.ts` drops it after
the run. Set `E2E_KEEP_DB=true` to keep the database for local debugging.

## Deployment and operations

| Script group | Purpose |
|---|---|
| `prod-deploy.sh` / `prod-deploy.ps1` | Production Docker deployment |
| `airgap-pack.sh` / `airgap-pack.ps1` | Build a Docker offline bundle |
| `airgap-install.sh` / `airgap-install.ps1` | Install the Docker offline bundle |
| `baremetal-pack.sh` / `baremetal-pack.ps1` | Build a no-Docker release bundle |
| `baremetal-install.sh` / `baremetal-install.ps1` | Install the no-Docker release |
| `backup.sh` / `backup.ps1` | Database and uploads backup. Exits non-zero if the database dump fails and skips retention in that case — see [`PRODUCTION_DEPLOYMENT.md`](../docs/operations/PRODUCTION_DEPLOYMENT.md) §5. |
| `ems-backup.service` / `ems-backup.timer` | Baremetal systemd units that run `backup.sh` on a daily schedule (`OnCalendar=*-*-* 03:00:00`, `Persistent=true`) — see [`BAREMETAL_OFFLINE_DEPLOYMENT.md`](../docs/operations/BAREMETAL_OFFLINE_DEPLOYMENT.md) §7.1. Docker Compose deployments schedule the same `backup.sh` via host cron instead, since the script runs on the host and finds the Postgres container through `docker exec`. |

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
