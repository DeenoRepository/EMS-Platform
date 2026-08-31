# Phase I — shared notes (presentation-file decomposition)

Originated with the `I1`–`I8` stories, which are now **all closed** — see
[`plans/README.md`](README.md) for their current status and
[`plans/done/2026-08/`](done/2026-08/) for the individual records. This file is
retained because the guidance below is not story-specific: it describes
standing hazards that apply to any future decomposition work. Not
auto-generated; update by hand when the underlying facts change.

## Stop-file: Sidebar.tsx

[`apps/web/src/components/layout/Sidebar.tsx`](../apps/web/src/components/layout/Sidebar.tsx)
is a **stop-file**. Extraction was attempted and reverted **twice** (audit
2026-08-27, again during the 2026-08-30 inspection cycle); it was deliberately
excluded from the I1–I8 scope. Story K4.1 later reduced it via a bounded
`loadData` extraction rather than a full split. If it is ever attempted again:

- Treat it as its own story, never bundled with another change.
- Manually regression-test the collapsed flyout behavior and permission
  gating before considering it done — these are the two things that broke
  both previous attempts.
- **Any observed behavior deviation → immediate revert**, do not attempt to
  patch forward.

## Known false-positives — do not refactor for score alone

The quality checker misreports these; refactoring them would not reduce
real risk:

| File | Why it's a false-positive |
|---|---|
| [`apps/web/src/theme/theme.ts`](../apps/web/src/theme/theme.ts) | 0 recognized functions — token definition file. |
| [`apps/web/src/components/eps/EquipmentTableView.tsx`](../apps/web/src/components/eps/EquipmentTableView.tsx) | 0 recognized functions — TSX parser limitation. |

More generally: `code_quality_checker.py` misattributes function boundaries
in TSX (e.g. it has previously reported `handleOpenDetails` in
`srm/page.tsx` as 428 lines and `handleQuickDispatch` in
`wms/operations/page.tsx` as 345 lines — both are actually the surrounding
render block, not the handler). Always verify real function boundaries with
`read_file` before deciding a file needs decomposition.

## Sequencing guidance

Phase I is closed, but the rule it established still applies to any future
decomposition phase: prefer the lowest-risk / smallest-diff story first, and
keep concurrent stories on disjoint files so they may run in parallel.
