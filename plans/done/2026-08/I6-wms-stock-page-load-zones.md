---
id: I6
title: Extract loadZones from wms/stock/page.tsx
status: done
phase: I
priority: P2
risk: low
skills: [senior-frontend]
opened: 2026-08-30
closed: 2026-08-30
commits: [1c06fce]
gates: [lint, tsc, check:quality]
---

# I6 — Extract loadZones from wms/stock/page.tsx

## Problem

[`apps/web/src/app/wms/stock/page.tsx`](../../apps/web/src/app/wms/stock/page.tsx)
is 819 lines; `loadZones` is 71 lines (cx 6.8 average — size and one long
function are the drivers, not branching complexity).

## Scope

Extract `loadZones` data-shaping logic (not the fetch call itself) into a
pure function, following the C3.1–C3.4 stock-page decomposition pattern
already applied to filters and zone cell rendering.

## Steps

1. Read the file completely.
2. Separate the `fetch` call (stays in the page, owns loading state) from
   the response-to-view-model mapping (pure function, testable).
3. Verify zone dropdown/selection behavior is unchanged.

## Definition of Done

- [x] `loadZones` in the page ≤ 30 lines; mapping logic in a pure, tested
      helper.
- [x] Zone list rendering and selection unchanged.
- [x] Full gate green: lint, tsc, `pnpm test`, quality baseline.

## Result

Extracted response-to-zone-list mapping into [`zone-response.ts`](../../apps/web/src/app/wms/stock/zone-response.ts). The page retains the fetch call, loading/error ownership, and selection reset behavior while delegating response validation to the pure helper.

Verification: web lint, web TypeScript check, 160 tests, quality baseline, and `git diff --check` passed.
