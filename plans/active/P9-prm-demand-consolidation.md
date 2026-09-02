---
id: P9
title: Добавить пост-согласовательную консолидацию потребности PRM
status: active
phase: P
priority: P2
risk: high
skills: [database-schema-designer, senior-backend, senior-frontend, senior-qa]
opened: 2026-09-02
closed: null
commits: []
gates: [lint, tsc, test, coverage, quality-baseline, route-test-coverage, static-security-policies, theme-tokens, doc-links]
---

# P9 — Добавить пост-согласовательную консолидацию потребности PRM

## Problem

Текущая модель хранит каждую потребность отдельно в
[`PurchaseRequestItem`](../../packages/database/prisma/schema.prisma:736), а заявка
имеет один `targetWarehouseId` в
[`PurchaseRequest`](../../packages/database/prisma/schema.prisma:681). После
согласования нет сущности, которая могла бы объединить одинаковую номенклатуру из
нескольких approved requests для работы закупщика, сохранив происхождение и
назначение каждой части. Реестр [`PrmRegistryContent()`](../../apps/web/src/app/prm/page.tsx:36)
ориентирован на отдельные заявки, а delivery route
[`POST()`](../../apps/web/src/app/api/prm/requests/[id]/deliveries/route.ts:97)
принимает товар строго по одной заявке и её целевому складу.

Заказчик подтвердил: консолидация выполняется только после полного согласования и
должна поддерживать несколько складов. Поставщик, RFQ и awarding не выбраны,
поэтому допустимый результат этой story — buyer workbench/batch abstraction, а
не выдуманный контракт закупки или победитель торгов.

## Scope

**Входит в scope:**

- PRM-specific `SourcingBatch`, агрегированные batch lines по номенклатуре/валюте
  и immutable line allocations к исходным request items и destination warehouses.
- Eligibility только для окончательно `APPROVED` quantities из завершённой
  approval attempt P8; доступное количество = approved requested quantity минус
  уже активные allocations, с запретом отрицательного/двойного распределения.
- Один batch может содержать allocations из нескольких заявок и на несколько
  складов; warehouse назначения хранится на allocation и никогда не теряется при
  агрегации одинаковой номенклатуры.
- Buyer workbench: поиск eligible demand, выбор количеств, preview totals,
  создание draft batch, редактирование allocations до release/freeze, просмотр
  lineage request → batch → allocation и обратной связи.
- Bounded lifecycle `DRAFT → RELEASED → CANCELLED` для рабочей подборки; release
  замораживает состав, cancellation освобождает allocations без изменения заявок.
- Scoped access для PRM managers/buyers по существующим warehouse rules; аудит и
  экспорт CSV batch/allocation breakdown.

**Не входит в scope:**

- Supplier model, RFQ, котировки, tender, award, purchase order, договор,
  бюджетирование или payment lifecycle.
- Автоматическое создание поставок, изменение WMS receipt, delivery route,
  `PurchaseDelivery` или распределение фактической поставки по batch.
- Изменение `requestedQty`, `receivedQty`, target warehouse или approval snapshot
  исходной заявки; никакой silent mutation approved demand.
- Консолидация до финального approval, cross-currency merge или автоматическое
  объединение без явного действия buyer.

## Steps

1. Спроектировать batch, batch line и allocation модели с constraints: allocation
   ссылается на request item и фиксирует request, destination warehouse, quantity,
   currency и approval attempt/version provenance.
2. Реализовать pure eligibility/remaining-allocation calculators и транзакционные
   guards от over-allocation, duplicate active allocation и stale approval state.
3. Реализовать scoped APIs списка eligible demand, preview/create/update/release/
   cancel batch с rate limit, RBAC, audit и safe errors.
4. Реализовать buyer workbench: grouped line view, раскрытие per-request и
   per-destination allocations, явный выбор quantity и предупреждения stale data.
5. Добавить batch details и обратные ссылки в PRM request details; export CSV
   должен содержать batch, nomenclature, source request/item, destination,
   allocated quantity и currency.
6. Добавить concurrency tests для двух buyers, invariants release/cancel и
   component tests multi-warehouse grouping без потери destinations.
7. Выполнить миграционные/security/quality gates и закрыть story одним коммитом.

## Definition of Done

- [ ] В консолидацию попадают только quantities из окончательно `APPROVED`
      заявок с завершённой approval attempt P8; draft/submitted/rejected/cancelled
      и уже полностью allocated demand исключены.
- [ ] Для каждого request item сумма активных allocations не превышает approved
      `requestedQty`; concurrent create/update не допускает over-allocation.
- [ ] Batch line агрегирует только совместимые nomenclature/currency, а каждый
      allocation сохраняет source request/item и destination warehouse; multi-
      warehouse totals раскладываются обратно без потери количества.
- [ ] Создание, release и cancel batch не меняют `requestedQty`, `receivedQty`,
      `targetWarehouseId`, approval snapshot или delivery/WMS records.
- [ ] `RELEASED` batch immutable; cancellation освобождает eligibility ровно один
      раз и сохраняет audit history.
- [ ] Buyer workbench останавливается на batch abstraction: в API/UI/schema нет
      supplier selection, RFQ, quote, award или purchase order semantics.
- [ ] CSV отражает как агрегированные линии, так и per-request/per-destination
      allocations и экранирует значения.
- [ ] Каждый write-route покрыт пятью обязательными осями; invariants,
      concurrency и UI grouping покрыты исполняемыми тестами в том же коммите,
      проверенными на падение при регрессии по
      [`.agents/rules/testing.md`](../../.agents/rules/testing.md).
- [ ] Миграция проверена на чистой/заполненной БД; пороги покрытия/quality
      baseline не понижены; full gate green.
- [ ] Story закрыта одним Conventional Commit; зависит от [P8](P8-prm-sequential-approvals.md),
      не зависит от P6 delivery rewrite и предоставляет consolidation data для
      [P10](P10-prm-procurement-analytics.md).

## Result
