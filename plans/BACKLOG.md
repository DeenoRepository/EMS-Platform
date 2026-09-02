# Backlog — unscheduled work

Items here have no open story file and no assigned phase order. They are
listed as trigger conditions, not commitments. When a trigger condition is
met, promote the item: create `plans/active/<id>-<slug>.md` from
[`plans/templates/story.md`](templates/story.md), remove the row below, run
`node scripts/plans-index.mjs`.

| ID | Title | Trigger condition | Notes |
|---|---|---|---|
| D | Broader type-safety pass (remove remaining `unknown`/`any` at external JSON boundaries) | Next time a bug traces back to an untyped SRM/Jira/WMS API boundary | Do not run as a repository-wide sweep. `D.1` and `D.4` (GitLab/Redmine `testConnection()` narrowing) are already closed — see `plans/done/2026-08/`. Pick one adjacent boundary at a time. |
| J4 | Redis-backed rate limit store | Only when planning a multi-instance deployment | Single-instance `InMemoryRateLimitStore` in [`apps/web/src/lib/rate-limit.ts`](../apps/web/src/lib/rate-limit.ts) is correct as-is for one node; this is not a defect. Must implement the same store interface, default to `memory`, fail-open on Redis unavailability with `logger.error`. |
| L5 | Согласовать правило об F-grade файлах с фактической практикой | При следующем пересмотре порогов качества | [`AGENTS.md`](../AGENTS.md) требует рефакторинга **всех** F-файлов до слияния в main, но порог в [`check-quality-baseline.mjs`](../scripts/check-quality-baseline.mjs) допускает их ненулевое количество, и гейт зелёный. Правило и гейт противоречат друг другу: либо норму смягчить до «не увеличивать количество», либо снижать порог до нуля поэтапно. Не менять пороги в отрыве от этого решения. Текущие значения — в [`QUALITY_BASELINE.md`](../docs/quality/QUALITY_BASELINE.md). |
| BACKLOG-WMS-01 | Extract `processStockIssue` into a testable pure utility | When writing WMS ISSUE operation tests or adding low-stock notification logic | Logic lives inline in [`apps/web/src/app/api/wms/operations/route.ts`](../apps/web/src/app/api/wms/operations/route.ts). Extract to `wms-operations-service.ts` and cover with real unit tests. |
| BACKLOG-WMS-02 | Extract transfer state machine (`dispatch/receive/reject`) into a testable service | When adding transfer workflow tests or introducing optimistic locking | Logic lives inline in the WMS transfers route. Extract to `wms-transfers-service.ts` with a clean functional interface. |
| BACKLOG-WMS-03 | Extract `reconcileInventory` into a pure service function | When building the inventory count UI or scheduling automated reconciliation | Reconciliation math is inline in the inventory route. Extract to `wms-inventory-service.ts`. |
| BACKLOG-MRO-01 | Extract `calculateScheduleHealth` into `mro-schedule-service.ts` | When adding MRO dashboard schedule status widgets | Overdue/warning badge logic is currently only tested via a local copy; extract and test the real implementation. |
| BACKLOG-MRO-02 | Extract `validateChecklistCompletion` into `mro-execution-service.ts` | When adding checklist enforcement to the MRO execution API | Completion guard is inline in the execution route; extract and write real unit tests. |
| BACKLOG-EPS-01 | Extract column `matchColumn` logic from `eps-import-matcher.ts` into a testable pure function | When improving import column matching accuracy or adding fuzzy matching | `mapFileHeaders` contains the matching loop; extract `matchColumn(header, rules)` → `string \| null`. |
| BACKLOG-EPS-02 | Extract import row collision detection into a pure utility | When building the import preview diff UI | Collision check against existing inventory/serial numbers is done inline; extract and test with real DB fixture sets. |
| BACKLOG-SRM-01 | Убрать потолок `take: 1000` при сопоставлении оборудования во входящем вебхуке | Когда парк оборудования приблизится к 1000 записям | [`srm/webhooks/[id]/route.ts`](../apps/web/src/app/api/srm/webhooks/[id]/route.ts) загружает до 1000 единиц оборудования на каждое событие и ищет совпадение в памяти. Это не N+1 и не утечка, но за пределами 1000 записей сопоставление станет молча неполным: заявка привяжется не к тому оборудованию или ни к какому. Заменить на адресный запрос по извлечённому идентификатору/инвентарному номеру. |
| BACKLOG-COV-01 | Поднять пороги покрытия до строки «После O7» (82/65/25) | После закрытия [`O7`](active/O7-e2e-flow-coverage.md) | Ratchet из [`O0`](active/O0-coverage-roadmap.md) требует поднимать пороги отдельным коммитом по факту достижения. Сейчас line-метрика идёт впритык к полу (79.37 % при пороге 79 %), поэтому поднимать её преждевременно — сначала нужен запас. Метрика reach (47.17 %) до целевых 65 % не дотягивает и требует реального расширения охвата, а не правки порога. |

---

This file is not auto-generated. Update it by hand when backlog items are
added, promoted, or dropped.
