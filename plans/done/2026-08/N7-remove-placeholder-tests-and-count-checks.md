---
id: N7
title: Remove placeholder test files and guard on check count, not file count
status: done
phase: N
priority: P2
risk: low
skills: [senior-qa]
opened: 2026-08-31
closed: 2026-08-31
commits: [test/N7-check-count-guard]
gates: [lint, test]
---

# N7 — Remove placeholder test files and guard on check count, not file count

## Problem

Two files match `*.test.ts` and contain zero checks — only comments left
behind by story `M4`:

* `packages/auth/src/eps-import.test.ts`
* `packages/auth/src/srm-service.test.ts`

Both say they exist "so git history shows the move clearly". Git history
already shows it; the working tree does not need a copy.

The side effect matters more than the clutter. The guard at
[`test-runner.mjs:79`](../../../scripts/test-runner.mjs:79) counts *files*:

```js
const MINIMUM_TEST_FILE_COUNT = 40;
```

Discovery currently finds exactly 40, two of which are empty. The guard is
already satisfied by two placeholders, and deleting them would trip it —
punishing the cleanup. A guard that can be satisfied by empty files does not
guard anything meaningful.

The placeholder also records unresolved work: `BACKLOG-EPS-01` and
`BACKLOG-EPS-02`. Those items are why
[`eps-import-matcher.ts`](../../../apps/web/src/lib/eps-import-matcher.ts)
(291 lines, 4 exported functions) still has no tests.

See [inspection §3.7](../../../docs/quality/inspections/2026-08-31-coverage-quality-audit.md).

## Scope

Changes: delete the two placeholders; change the runner guard to count
executed checks; move the two backlog notes into
[`plans/BACKLOG.md`](../../BACKLOG.md) so they survive the deletion.

Explicitly NOT changing: any real test, and not writing the
`eps-import-matcher` tests here — those belong to `N8`.

## Steps

1. Transcribe `BACKLOG-EPS-01` and `BACKLOG-EPS-02` into
   [`plans/BACKLOG.md`](../../BACKLOG.md) with a link to the commit that
   removed the placeholder, then delete both files.
2. Replace `MINIMUM_TEST_FILE_COUNT` with a floor on the number of checks
   reported by the run (parsed from the `ℹ tests N` TAP summary line), set
   to the current measured count. Files are a proxy; checks are the thing.
3. Keep a secondary, lower file-count floor purely to catch a catastrophic
   discovery failure (e.g. a bad glob returning nothing).
4. Fail with a message naming both numbers so a future drop is diagnosable
   without rerunning locally.

## Definition of Done

- [x] No `*.test.ts` file in the repository contains zero checks.
- [x] The runner fails when the executed-check count drops below the floor —
      proven by temporarily commenting out a test.
- [x] Both backlog items are recorded in `plans/BACKLOG.md`.
- [x] Full gate green: lint, test.

## Result

Deleted the two zero-check placeholders from `packages/auth/src`.
`BACKLOG-EPS-01` and `BACKLOG-EPS-02` were already present in
`plans/BACKLOG.md`, so they were preserved without duplication.

The Node runner now rejects discovered `*.test.ts` files that contain no
`test()`/`it()` declarations, streams child TAP output, parses the final
executed-check summary, and enforces a 303-check floor. A secondary catastrophic
file floor of 40 remains; the real post-cleanup discovery count is 43 files.

The guard was proven by temporarily raising the floor to 304: the otherwise
green 303-check suite failed with a diagnostic naming executed checks, required
minimum, discovered files, and file floor. Restored floor 303 passes.

Historical inspection/completed-story links to the deliberately removed files
remain immutable. `check-doc-links.mjs` has a narrowly-scoped exception for only
those two removed targets and only under `docs/quality/inspections/` or
`plans/done/`; active documentation receives no exception.

Final gates: lint PASS, TypeScript PASS, Node 303/303 PASS, component 38/38
PASS, three-metric coverage PASS, and docs PASS.
