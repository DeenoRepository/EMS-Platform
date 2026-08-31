---
id: N1
title: Fix platform-dependent backup-script test that reddens the gate
status: active
phase: N
priority: P0
risk: low
skills: [senior-qa]
opened: 2026-08-31
closed: null
commits: []
gates: [lint, tsc, test]
---

# N1 — Fix platform-dependent backup-script test that reddens the gate

## Problem

[`backup-script.test.ts`](../../apps/web/src/lib/__tests__/backup-script.test.ts)
fails both of its checks on Windows, which makes `pnpm test` and therefore
`node scripts/check-coverage.mjs` exit non-zero on a clean tree:

```
✖ exits non-zero and creates no dump file when the database dump fails
  Error: EPERM, Permission denied … Temp\ems-backup-fail-L94sHB (rmSync)
✖ exits zero and creates a non-empty dump file when the database dump succeeds
  AssertionError: backup.sh must exit zero … 1 !== 0
```

Two root causes:

1. [`backup-script.test.ts:40`](../../apps/web/src/lib/__tests__/backup-script.test.ts:40)
   and [`:69`](../../apps/web/src/lib/__tests__/backup-script.test.ts:69)
   hard-code the POSIX `PATH` separator: `${mockBinDir}:${process.env.PATH}`.
   On Windows the separator is `;`, so the mock `docker`/`pg_dumpall` are
   never found and the real script fails.
2. `chmodSync(filePath, 0o755)` at
   [`:22`](../../apps/web/src/lib/__tests__/backup-script.test.ts:22) is a
   no-op on NTFS; and `rmSync` on the temp dir races with the still-open
   `bash` child handle, producing `EPERM`.

The test is genuinely valuable (it executes the real `backup.sh`), so the
answer is to make it correct, not to delete it. See
[inspection §3.1](../../docs/quality/inspections/2026-08-31-coverage-quality-audit.md).

## Scope

Changes: the test file only.

Explicitly NOT changing: [`scripts/backup.sh`](../../scripts/backup.sh)
behaviour, the assertions themselves (fail-closed semantics stay verified),
or the CI workflow.

## Steps

1. Replace the hard-coded `:` with `path.delimiter`.
2. Guard the suite with a runtime capability check rather than an OS check:
   skip when `bash` is not resolvable on `PATH` (covers Windows without Git
   Bash while still running under Git Bash / WSL / Linux CI). Use
   `describe.skip` with an explicit reason string — never a silent skip.
3. Wrap teardown in a helper that retries `rmSync` with
   `{ recursive: true, force: true, maxRetries: 3, retryDelay: 100 }` and
   moves it into an `after()` hook so it runs even when an assertion throws.
4. Verify on Windows (`pnpm test`) and confirm the suite still executes on
   Linux CI rather than silently skipping everywhere.

## Definition of Done

- [ ] `pnpm test` exits 0 on Windows with no failing checks.
- [ ] The suite still executes (not skips) on the Linux CI runner — verified
      by the presence of both check names in the CI log.
- [ ] No temp directories are left in `os.tmpdir()` after a failed run.
- [ ] Full gate green: lint, tsc, test.

## Result

_To be filled on close._
