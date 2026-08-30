---
id: I6
title: Extract loadZones from wms/stock/page.tsx
status: active
phase: I
priority: P2
risk: low
skills: [senior-frontend]
opened: 2026-08-30
closed: null
commits: []
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

- [ ] `loadZones` in the page ≤ 30 lines; mapping logic in a pure, tested
      helper.
- [ ] Zone list rendering and selection unchanged.
- [ ] Full gate green: lint, tsc, `pnpm test`, quality baseline.

## Result

_Not yet closed._
