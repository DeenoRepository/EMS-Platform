---
id: P6
title: Добавить двустороннюю трассировку PRM и WMS-приходов
status: active
phase: P
priority: P1
risk: high
skills: [database-schema-designer, senior-backend, senior-frontend, senior-qa]
opened: 2026-09-02
closed: null
commits: []
gates: [lint, tsc, test, coverage, quality-baseline, route-test-coverage, static-security-policies, theme-tokens, doc-links]
---

# P6 — Добавить двустороннюю трассировку PRM и WMS-приходов

## Problem

P2 уже связывает каждую `PurchaseDelivery` с одним `StockOperation` через
уникальный `stockOperationId` в
[`PurchaseDelivery`](../../packages/database/prisma/schema.prisma:754), а обратное
отношение `purchaseDelivery` существует в
[`StockOperation`](../../packages/database/prisma/schema.prisma:509). Роут поставки
атомарно создаёт WMS-приход, delivery и позиции в
[`POST()`](../../apps/web/src/app/api/prm/requests/[id]/deliveries/route.ts:129).
Однако PRM detail API не включает `deliveries`, а
[`PrmRequestDetailsDialog()`](../../apps/web/src/components/prm/PrmRequestDetailsDialog.tsx:22)
показывает только суммарный прогресс. WMS list API в
[`GET()`](../../apps/web/src/app/api/wms/operations/route.ts:13) не включает
`purchaseDelivery`, а
[`WmsOperationsTable()`](../../apps/web/src/components/wms/WmsOperationsTable.tsx:35)
не показывает источник PRM. Существующая фактическая связь поэтому скрыта в обе
стороны и непригодна для операционного аудита.

## Scope

**Входит в scope:**

- Показать в PRM карточке журнал поставок с WMS operation ID, документом, датой,
  складом, исполнителем и построчными количествами.
- Показать в WMS журнале для PRM-связанных `RECEIPT` источник: номер заявки,
  delivery ID и переход к PRM карточке.
- Расширить WMS operations query фильтрами `purchaseRequestId` и/или
  `purchaseDeliveryId`, сохраняя warehouse scoping.
- Ввести стабильное человекочитаемое представление идентификатора операции или
  отображать неизменяемый текущий UUID без выдумывания нового document lifecycle.
- Обеспечить scoping каждой стороны: PRM ссылка не раскрывает WMS данные без WMS
  permission, WMS ссылка не раскрывает PRM данные без PRM permission.

**Не входит в scope:**

- Изменение механизма создания приходов, остатков, partial delivery или
  idempotency P2.
- Привязка произвольного вручную созданного WMS-прихода к PRM задним числом.
- Изменение статусов PRM, закрытия P4 или переписывание WMS operation wizard.
- Изменение поставщика/RFQ, консолидации P9 или delivery allocation.

## Steps

1. Зафиксировать минимальные relation selects для PRM detail и WMS operations,
   исключив циклические/избыточные payloads.
2. Расширить PRM detail response журналом `deliveries → stockOperation → items`
   с существующим scoping заявки.
3. Расширить WMS list where model и API source-фильтрами, а include — краткой
   цепочкой `purchaseDelivery → request`.
4. Добавить в PRM details таблицу поставок и переход в WMS operations с точным
   фильтром operation/delivery.
5. Добавить в WMS table source badge/link для PRM receipts и отсутствие badge
   для обычных ручных операций.
6. Добавить route/service/component тесты на двустороннюю навигацию, relation
   mapping, фильтры и запрет утечки данных между permission scopes.
7. Выполнить migration check, если для индексирования source filter потребуется
   schema migration; выполнить все gates и закрыть story одним коммитом.

## Definition of Done

- [ ] PRM карточка отображает каждую `PurchaseDelivery` и соответствующий ровно
      один `StockOperation(RECEIPT)` с позициями и фактическими количествами.
- [ ] WMS журнал отмечает только автоматически созданные PRM-приходы и показывает
      номер исходной заявки; обычные приходы не получают ложную связь.
- [ ] Переход PRM → WMS открывает конкретный приход/отфильтрованный журнал, а
      WMS → PRM использует canonical deep link из [P3](P3-fix-prm-notification-navigation.md).
- [ ] Source-фильтры WMS не обходят warehouse access; PRM detail не раскрывает
      WMS-only fields пользователю без соответствующего доступа.
- [ ] Cardinality остаётся 1:1 между delivery и stock operation, уникальные
      ограничения P2 сохранены, создание прихода не дублируется.
- [ ] Ни расчёт остатков, ни `receivedQty`, ни status progression не изменены.
- [ ] Новое и изменённое поведение покрыто исполняемыми тестами в том же коммите;
      тесты проверены на падение при регрессии согласно
      [`.agents/rules/testing.md`](../../.agents/rules/testing.md).
- [ ] При наличии миграции она версионирована и проверена на чистой/заполненной
      БД; `db push` не используется.
- [ ] Пороги покрытия/quality baseline не понижены; full gate green.
- [ ] Story закрыта одним Conventional Commit; зависит от [P3](P3-fix-prm-notification-navigation.md),
      не зависит от P4/P5/P7–P9 и предоставляет receipt data для [P10](P10-prm-procurement-analytics.md).

## Result
