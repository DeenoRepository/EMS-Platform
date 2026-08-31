---
id: N7
title: Remove placeholder test files and guard on check count, not file count
status: active
phase: N
priority: P2
risk: low
skills: [senior-qa]
opened: 2026-08-31
closed: null
commits: []
gates: [lint, test]
---

# N7 — Remove placeholder test files and guard on check count, not file count

## Problem

Two files match `*.test.ts` and contain zero checks — only comments left
behind by story `M4`:

* [`packages/auth/src/eps-import.test.ts`](../../packages/auth/src/eps-import.test.ts)
* [`packages/auth/src/srm-service.test.ts`](../../packages/auth/src/srm-service.test.ts)

Both say they exist "so git history shows the move clearly". Git history
already shows it; the working tree does not need a copy.

The side effect matters more than the clutter. The guard at
[`test-runner.mjs:79`](../../scripts/test-runner.mjs:79) counts *files*:

```js
const MINIMUM_TEST_FILE_COUNT = 40;
```

Discovery currently finds exactly 40, two of which are empty. The guard is
already satisfied by two placeholders, and deleting them would trip it —
punishing the cleanup. A guard that can be satisfied by empty files does not
guard anything meaningful.

The placeholder also records unresolved work: `BACKLOG-EPS-01` and
`BACKLOG-EPS-02`. Those items are why
[`eps-import-matcher.ts`](../../apps/web/src/lib/eps-import-matcher.ts)
(291 lines, 4 exported functions) still has no tests.

See [inspection §3.7](../../docs/quality/inspections/2026-08-31-coverage-quality-audit.md).

## Scope

Changes: delete the two placeholders; change the runner guard to count
executed checks; move the two backlog notes into
[`plans/BACKLOG.md`](../BACKLOG.md) so they survive the deletion.

Explicitly NOT changing: any real test, and not writing the
`eps-import-matcher` tests here — those belong to `N8`.

## Steps

1. Transcribe `BACKLOG-EPS-01` and `BACKLOG-EPS-02` into
   [`plans/BACKLOG.md`](../BACKLOG.md) with a link to the commit that
   removed the placeholder, then delete both files.
2. Replace `MINIMUM_TEST_FILE_COUNT` with a floor on the number of checks
   reported by the run (parsed from the `ℹ tests N` TAP summary line), set
   to the current measured count. Files are a proxy; checks are the thing.
3. Keep a secondary, lower file-count floor purely to catch a catastrophic
   discovery failure (e.g. a bad glob returning nothing).
4. Fail with a message naming both numbers so a future drop is diagnosable
   without rerunning locally.

## Definition of Done

- [ ] No `*.test.ts` file in the repository contains zero checks.
- [ ] The runner fails when the executed-check count drops below the floor —
      proven by temporarily commenting out a test.
- [ ] Both backlog items are recorded in `plans/BACKLOG.md`.
- [ ] Full gate green: lint, test.

## Result

_To be filled on close._
