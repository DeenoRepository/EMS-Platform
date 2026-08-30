---
id: C1
title: Split admin settings page into focused panels
status: done
phase: C
priority: MEDIUM
risk: low
skills: [senior-frontend]
opened: 2026-08-29
closed: 2026-08-29
commits: []
gates: [lint, tsc, test, check:quality]
---

# C1 — Split admin settings page into focused panels

## Problem

[`apps/web/src/app/admin/settings/page.tsx`](../../../apps/web/src/app/admin/settings/page.tsx)
was 1097 lines, bundling maintenance toggles, LDAP test panel, SRM test
panel, and database dump download in one file.

## Scope

Extracted panels one at a time, each its own commit; state, fetch, and
handlers stayed in the route owner (page remains the orchestrator).

## Sub-stories

- **C1.1** — Maintenance panel extracted to
  [`AdminMaintenancePanel.tsx`](../../../apps/web/src/components/admin/settings/AdminMaintenancePanel.tsx).
  Verified: lint, tsc, 160 tests, quality baseline (web 78.4, F-grade 38).
  Commit: `refactor(admin): extract maintenance panel from settings page`.
- **C1.2a** — LDAP integration panel extracted to
  [`AdminLdapIntegrationPanel.tsx`](../../../apps/web/src/components/admin/settings/AdminLdapIntegrationPanel.tsx);
  result DTO and callbacks preserved.
- **C1.2b** — SRM integration panel extracted to
  [`AdminSrmIntegrationPanel.tsx`](../../../apps/web/src/components/admin/settings/AdminSrmIntegrationPanel.tsx);
  provider-specific fields, diagnostics, callbacks preserved. Verified: 160
  tests, lint, tsc, route audit, theme check, quality baseline (web 78.5,
  F=38).
- **C1.3** — Database dump panel extracted to
  [`AdminDatabaseDumpPanel.tsx`](../../../apps/web/src/components/admin/settings/AdminDatabaseDumpPanel.tsx);
  `dumpMode`, confirmation flow, download behavior preserved. Verified: 160
  tests, lint, tsc, route audit, theme check, quality baseline (web 78.5,
  F=37).
- **C1.4** — Final verification: page at 516 lines, all imports used,
  lint/tsc and `git diff --check` PASS. No further orchestration splitting
  required.

## Result

Admin settings page reduced from 1097 to 516 lines across 4 extractions,
API contracts and UI behavior unchanged throughout.
