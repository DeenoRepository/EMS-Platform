---
id: P1
title: Модуль PRM — схема, RBAC, API и согласование заявок на закупку ТМЦ
status: done
phase: P
priority: P1
risk: high
skills: [database-schema-designer, senior-backend, senior-frontend, senior-qa]
opened: 2026-09-02
closed: 2026-09-02
commits: ["feat(prm): foundation, RBAC, API, approval workflow and UI"]
gates: [lint, tsc, test, coverage, quality-baseline, route-test-coverage, static-security-policies, theme-tokens, doc-links]
---

# P1 — Модуль PRM: схема, RBAC, API и согласование заявок на закупку ТМЦ

## Problem

В платформе нет контура подачи и контроля заявок на закупку ТМЦ. Существующие
механизмы закрывают только смежные задачи:

- [`StockTransfer`](../../../packages/database/prisma/schema.prisma:601) реализует
  цикл «заявка → согласование → отгрузка → приёмка», но **только между
  внутренними складами**; внешней закупки не покрывает.
- [`EquipmentApproval`](../../../packages/database/prisma/schema.prisma:341) даёт
  одноуровневое согласование, но привязан к оборудованию и не имеет позиций
  с количеством.
- [`StockOperation`](../../../packages/database/prisma/schema.prisma:499) с
  `OperationType.RECEIPT` оформляет приход, но не знает, по какой заявке он
  пришёл; поставщик хранится строкой `counterparty`.
- [`Nomenclature`](../../../packages/database/prisma/schema.prisma:458) не содержит
  цены, поэтому стоимость должна фиксироваться на позиции заявки.

Итого: потребность в ТМЦ, её согласование и связь с фактическим приходом нигде
не отслеживаются.

## Решения по вариантам реализации (зафиксированы с заказчиком)

| # | Развилка | Выбранный вариант |
|---|---|---|
| 1 | Позиционирование | Отдельный top-level модуль **PRM** (`/prm`), права `prm.*`, регистрация в `ModuleStatusMap` |
| 2 | Согласование | Один согласующий, плоский enum-статус, без таблицы шагов |
| 3 | Исполнение | Полный цикл с частичными поставками, авто-создание `StockOperation(RECEIPT)` — **вынесено в P2** |
| 4 | Позиции и цены | Только из `Nomenclature`; цена/сумма оценочная и фактическая; поставщик строкой, без модели `Supplier` |
| 5 | Источники и видимость | Ручное создание + привязка к `Equipment` / `MaintenanceSchedule` + авто-предложение по дефициту (**дефицит — в P2**); видимость scoped по складам, где пользователь МОЛ |
| 6 | Интеграции и объём | Автономный контур, без Jira/1С. Две итерации: **P1** — схема + RBAC + API + согласование; **P2** — приёмка, дефицит, экспорт |

## Scope

**Изменяется:**

- `packages/database/prisma/schema.prisma` — новые модели `PurchaseRequest`,
  `PurchaseRequestItem`, enum `PurchaseRequestStatus`, `PurchaseRequestPriority`;
  обратные связи в `User`, `Warehouse`, `Nomenclature`, `Equipment`,
  `MaintenanceSchedule`. Полный enum статусов заводится сразу (включая значения
  стадии исполнения), чтобы P2 не требовал второй миграции enum.
- Новая версионированная миграция Prisma (не `db push`).
- [`packages/shared/src/permissions.ts`](../../../packages/shared/src/permissions.ts) —
  права `prm.*` и расширение union `module` значением `'prm'`.
- [`packages/database/src/seed-data/permissions-roles.ts`](../../packages/database/src/seed-data/permissions-roles.ts) —
  выдача новых прав существующим ролям.
- [`ModuleStatusMap` и `ALLOWED_MODULES`](../../../apps/web/src/app/api/modules/status/route.ts:9) —
  добавление `prm`.
- Новый доменный сервис `apps/web/src/lib/prm-requests-service.ts` (scoping,
  генерация номера, построение `where`, счётчики вкладок) — по образцу
  [`wms-transfers-service.ts`](../../apps/web/src/lib/wms-transfers-service.ts:14).
- Роуты `apps/web/src/app/api/prm/requests/**` — список, создание, деталь,
  submit, approve, reject, cancel.
- Страницы `apps/web/src/app/prm/**` — реестр с вкладками по статусам, мастер
  создания, карточка заявки.
- Навигация: [`Sidebar`](../../apps/web/src/components), `CommandPalette`.
- `NotificationType` — значения для событий подачи и резолюции заявки.

**Не изменяется:**

- Контракт и поведение `StockTransfer`, `StockOperation`, `EquipmentApproval`.
- Существующие права `wms.*`, `eps.*`, `srm.*`, `mro.*`.
- Логика списания остатков (приход по заявке появляется только в P2).

## Модель данных (целевая)

`PurchaseRequest`: `requestNumber` (уникальный, префикс `PR-`), `status`,
`priority`, `targetWarehouseId`, `requesterId`, `reviewerId`, `reviewedAt`,
`resolutionComment`, `justification`, `supplierName` (строка), `requiredByDate`,
`equipmentId?`, `maintenanceScheduleId?`, `estimatedTotal`, `currency`, таймстемпы.

`PurchaseRequestItem`: `requestId`, `nomenclatureId`, `requestedQty`,
`estimatedPrice`, `actualPrice?`, `receivedQty` (по умолчанию 0, задействуется
в P2), `comment?`.

`PurchaseRequestStatus`: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`,
`CANCELLED`, `IN_PROGRESS`, `PARTIALLY_DELIVERED`, `DELIVERED`, `CLOSED`.
В P1 доступны переходы только внутри `DRAFT → SUBMITTED → APPROVED/REJECTED`
и `→ CANCELLED`; остальные статусы отвергаются валидатором переходов.

## Steps

1. Спроектировать и добавить модели/энумы в `schema.prisma`, сгенерировать
   версионированную миграцию, обновить сиды.
2. Добавить права `prm.*` в `PERMISSIONS` и `PERMISSION_DEFINITIONS`, расширить
   union `module`, раздать права ролям в сидах.
3. Зарегистрировать `prm` в `ModuleStatusMap` / `ALLOWED_MODULES`.
4. Реализовать `prm-requests-service.ts`: `isPurchaseAdmin`,
   `resolveUserWarehouseIds`-аналог, `generatePurchaseRequestNumber`,
   `buildPurchaseRequestWhereInput`, чистый валидатор переходов статусов.
5. Реализовать API-роуты с `requireAuth`, `enforceRateLimit`, `safeErrorResponse`
   и `logAuditEvent` на каждом изменении статуса.
6. Реализовать UI: реестр с вкладками, мастер создания позиций из справочника,
   карточка с действиями согласования — только компоненты `@/components/ui`,
   статусы через `StatusBadge`, без hex-цветов.
7. Добавить типы уведомлений и отправку при `SUBMITTED` / `APPROVED` / `REJECTED`.
8. Покрыть тестами (см. Definition of Done).

## Definition of Done

- [x] Миграция применяется на чистой БД и на БД с данными; `db push` не используется.
- [x] Все роуты `/api/prm/**` проходят `scripts/check-route-test-coverage.mjs`
      и `scripts/check-static-security-policies.mjs`.
- [x] Валидатор переходов статусов — чистая функция; тест доказывает отказ для
      всех недопустимых переходов, включая попытку выставить `DELIVERED` в P1.
- [x] Тест подтверждает: пользователь без `prm.*` получает 403; не-МОЛ не видит
      чужие заявки в списке (проверка на исполнении handler, не на тексте кода).
- [x] Тест подтверждает уникальность `requestNumber` и корректный подсчёт
      `estimatedTotal` по позициям.
- [x] Компонентные тесты мастера создания: нельзя отправить заявку без позиций
      и с нулевым/отрицательным количеством.
- [x] Каждый новый тест проверен на «покраснение» при внесении регрессии.
- [x] Пороги покрытия и quality-baseline не понижены.
- [x] Full gate green: см. `gates:` в front-matter.

## Result

Добавлен самостоятельный PRM-контур закупочных заявок. В Prisma-схему и
версионированную миграцию вошли `PurchaseRequest`, `PurchaseRequestItem`,
статусы полного жизненного цикла, приоритеты и типы уведомлений. Введены права
`prm.requests.view/create/manage`, scoping по МОЛ складов и защита от запроса
чужого склада.

Реализованы список и создание заявок, карточка заявки с редактированием
черновика, подача на согласование, согласование, отклонение с обязательной
причиной и отмена. Все write-роуты используют auth/RBAC, rate limit, audit и
sanitized errors. Добавлены реестр PRM, мастер создания, review/details dialogs,
навигация Sidebar/CommandPalette и maintenance-status поддержка `prm`.

Проверки: Prisma migration status — актуален; `tsc` — PASS; `pnpm lint` — PASS;
Node runner — 724/724 checks; Vitest component suite — PASS; route coverage —
91/91; theme tokens, static security policies, doc links и quality baseline —
PASS. Порог quality baseline не понижен.
