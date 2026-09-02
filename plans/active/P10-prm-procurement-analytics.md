---
id: P10
title: Добавить аналитику закупочных заявок и KPI PRM
status: active
phase: P
priority: P2
risk: high
skills: [senior-backend, senior-frontend, senior-qa]
opened: 2026-09-02
closed: null
commits: []
gates: [lint, tsc, test, coverage, quality-baseline, route-test-coverage, static-security-policies, theme-tokens, doc-links]
---

# P10 — Добавить аналитику закупочных заявок и KPI PRM

## Problem

Текущий PRM реестр показывает четыре status-счётчика в
[`PrmRegistryContent()`](../../apps/web/src/app/prm/page.tsx:36), а API формирует
только простые counts через
[`buildPurchaseRequestStats()`](../../apps/web/src/app/api/prm/requests/get-query.ts:44).
Он не отвечает на вопросы о cycle time, SLA, поставках, стоимости,
консолидации, складах или источниках EPS/MRO.

В проекте уже есть общая карточка графика
[`ChartCard()`](../../apps/web/src/components/ui/ChartCard.tsx:35), Recharts-паттерн
с KPI, chart и drill-down table в
[`SrmReliabilityAnalytics()`](../../apps/web/src/components/srm/SrmReliabilityAnalytics.tsx:53),
а общий dashboard агрегирует данные напрямую через Prisma в
[`GET()`](../../apps/web/src/app/api/dashboard/stats/route.ts:11). Эти паттерны
позволяют построить PRM аналитику внутри существующего Next.js/Prisma приложения,
без отдельного analytics service или data warehouse.

## Scope

**Входит в scope:**

- Отдельная PRM analytics page и scoped read-only API, использующие текущую БД,
  Prisma ORM и существующие UI/chart primitives.
- Общие фильтры: период по created/submitted/approved/delivered/closed date
  согласно выбранной метрике, warehouse, status, priority, requester, equipment,
  maintenance source и currency; суммы разных валют не складываются без
  раздельной группировки.
- KPI family `Demand`: количество заявок/позиций, requested quantity, estimated
  value по валюте, доля EPS/MRO/manual sources, top nomenclature и warehouses.
- KPI family `Approval`: submitted count, approval/rejection rate, median и p90
  approval cycle, active stage aging, SLA compliance и overdue count на данных P7/P8.
- KPI family `Fulfillment`: approved-to-first-receipt, approved-to-delivered,
  delivered-to-closed, fill rate `received/requested`, partial deliveries,
  overdue required-by requests и receipt count/value на данных P4/P6.
- KPI family `Consolidation`: eligible demand, allocated quantity/value, batch
  count, average requests/destinations per released batch и unallocated approved
  demand на данных P9.
- Drill-down из каждой карточки/точки графика в scoped таблицу исходных заявок,
  стадий, deliveries или allocations; CSV для табличных drill-down datasets.

**Не входит в scope:**

- Отдельный сервис аналитики, data warehouse, OLAP cube, ETL, event streaming или
  materialized aggregate infrastructure без доказанной необходимости.
- Forecasting/ML, supplier performance, RFQ/award/PO spend analytics, бюджетные
  показатели или currency conversion.
- Изменение транзакционных workflow rules P4/P7/P8/P9 ради метрик.
- Enterprise dashboard redesign; максимум — ссылка/краткий PRM summary после
  готовности отдельной страницы.

## Steps

1. Зафиксировать analytics DTO, metric date semantics, denominator/null rules,
   percentile calculation и currency grouping в чистом PRM analytics service.
2. Реализовать scoped aggregate API с `requireAuth`, rate limit и Prisma queries;
   переиспользовать PRM warehouse visibility и не загружать все записи для
   вычислений, которые поддерживаются БД.
3. Реализовать отдельную analytics page с FilterToolbar, StatCard/ChartCard,
   semantic tokens, loading/empty/error states и URL-синхронизированными фильтрами.
4. Добавить charts: demand trend/value by currency, status funnel, approval SLA
   trend/stage aging, fulfillment lead-time/fill-rate и consolidation overview.
5. Реализовать drill-down contracts и таблицы с canonical PRM links, EPS/MRO/WMS
   links где доступно, а также CSV export текущего scoped drill-down.
6. Добавить unit tests metric formulas/edge cases, route tests RBAC/scoping/
   filters, component tests interactions и deterministic date/percentile tests.
7. Проверить query plans/индексы на целевых filters; добавлять migration только
   для обоснованных индексов, затем выполнить полные gates и закрыть одним коммитом.

## Definition of Done

- [ ] Demand KPI точно определяют counts, quantities, estimated value отдельно по
      currency, source mix, top nomenclature и target warehouses.
- [ ] Approval KPI используют history P8 и SLA snapshots P7: rate denominators,
      median/p90, active aging, compliance и overdue воспроизводимы тестами.
- [ ] Fulfillment KPI используют delivery/WMS traceability P6 и explicit close P4:
      first receipt, delivered, closed cycle times и fill rate не выводятся из
      audit text или текущего status без фактических timestamps/relations.
- [ ] Consolidation KPI используют allocations/batches P9 и сохраняют breakdown
      по request и destination warehouse.
- [ ] Каждая aggregate card/chart имеет drill-down, который при тех же filters
      объясняет значение исходными rows; суммы/counts сверяются в тестах.
- [ ] Пользователь видит только warehouses/requests, доступные по существующему
      PRM scope; API возвращает 401/403 где применимо и не раскрывает global totals.
- [ ] CSV доступен для конкретных drill-down таблиц, повторяет active filters,
      содержит стабильные заголовки и корректное escaping; chart-image/PDF export
      не требуется.
- [ ] Нет отдельного analytics service/data warehouse и нет raw SQL; Prisma и
      существующее приложение достаточны для bounded scope.
- [ ] Новое и изменённое поведение покрыто исполняемыми тестами в том же коммите,
      route axes и regression checks выполнены согласно
      [`.agents/rules/testing.md`](../../.agents/rules/testing.md).
- [ ] Обоснованные индексы, если нужны, поставлены версионированной миграцией;
      coverage/quality thresholds не снижены; full gate green.
- [ ] Story закрыта одним Conventional Commit; зависит от [P4](P4-explicit-prm-close-workflow.md),
      [P5](P5-prm-links-eps-mro.md), [P6](P6-prm-wms-receipt-traceability.md),
      [P7](P7-prm-sla-aging-escalations.md), [P8](P8-prm-sequential-approvals.md) и
      [P9](P9-prm-demand-consolidation.md).

## Result
