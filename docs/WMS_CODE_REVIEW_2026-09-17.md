# Ревью модуля WMS

> Дата: 2026-09-17  
> Область: WMS API, страницы и компоненты WMS, Prisma-модели, RBAC, тесты и служебные WMS-скрипты  
> Метод: статический read-only анализ тремя независимыми проходами  
> Вердикт: **BLOCK / Request changes**

## Ограничения проверки

- Подключения к VPS и действующей базе данных не выполнялись.
- Миграции, seed, import, fix и stock recalculation не запускались.
- Проверка конкурентных сценариев выполнена по коду; для подтверждения исправлений потребуется отдельная тестовая БД.
- Каталог `Temp/`, уже находившийся в рабочем дереве, не анализировался и не изменялся.

## Итог

WMS нельзя считать безопасным для конкурентного материального учёта. Текущая реализация допускает расхождение между `StockItem`, `StockOperation`, `StockTransfer` и `Inventory`, а endpoint пересчёта способен превратить корректные остатки в некорректные.

Классы блокирующих проблем:

1. Пересчёт остатков основан на неполном и неоднозначном журнале.
2. Изменение остатков и переходы transfer state machine не защищены от гонок.
3. МОЛ-ограничения применяются непоследовательно и местами работают fail-open.
4. Инвентаризация может затереть более свежие движения и принять некорректные значения.
5. Модель адресного хранения не обеспечивает целостность склада и ячейки.
6. UI содержит действия, которые либо опасны, либо не выполняют заявленную операцию.
7. Имеющиеся тесты в основном тестируют локальные симуляции, а не production-код.

## Критические замечания

### WMS-C01. Пересчёт остатков повреждает данные после transfer и inventory

**Файлы:**

- `apps/web/src/app/api/wms/stock/recalculate/route.ts:17-80`
- `scripts/recalculate-stock.js:14-85`
- `apps/web/src/app/api/wms/operations/route.ts:208-230`
- `apps/web/src/app/api/wms/operations/route.ts:320-365`
- `apps/web/src/app/api/wms/transfers/[id]/receive/route.ts:113-130`
- `apps/web/src/app/api/wms/inventories/[id]/route.ts:137-176`
- `apps/web/src/app/wms/stock/page.tsx:589-607`

`recalculate` считает любой `TRANSFER` приходом на склад операции:

```ts
if (op.type === 'RECEIPT' || op.type === 'TRANSFER') {
  current.quantity += qty;
}
```

При этом generic `operations/TRANSFER` создаёт операцию на исходном складе, где товар фактически списывается. В transfer workflow списание source вообще не получает соответствующую `StockOperation`, а при приёмке создаётся только операция target.

Инвентаризация записывает `ADJUSTMENT.quantity = abs(diffQty)`, но пересчёт принимает это значение за абсолютный остаток. При expected `100` и actual `97` журнал содержит `3`, после чего пересчёт устанавливает остаток в `3`.

Дополнительные дефекты алгоритма:

- отрицательная история скрывается через `Math.max(0, ...)`;
- позиции без записей в `balances` не обнуляются;
- результат применяется не в общей транзакции;
- параллельные движения могут быть затёрты;
- placement по ячейкам не восстанавливается.

**Воздействие:** массовая порча остатков при ручной «Синхронизации» или запуске скрипта.

**Требование:** до появления однозначного signed ledger endpoint, кнопку и скрипт считать запрещёнными к запуску.

### WMS-C02. Конкурентные переходы transfer выполняют движение несколько раз

**Файлы:**

- `apps/web/src/app/api/wms/transfers/[id]/dispatch/route.ts:20-100`
- `apps/web/src/app/api/wms/transfers/[id]/receive/route.ts:25-145`
- `apps/web/src/app/api/wms/transfers/[id]/reject/route.ts:20-120`

Статус transfer читается и проверяется до транзакции. В транзакции применяется обычный `update({ where: { id } })` без условия по ожидаемому статусу.

Возможные результаты:

- два `dispatch` дважды списывают source;
- два `receive` дважды зачисляют target и создают две операции;
- два `reject` дважды восстанавливают source;
- параллельные `receive` и `reject` оставляют товар одновременно на source и target, а финальный статус зависит от последней записи.

**Требование:** атомарный compare-and-set по `(id, expectedStatus)`, optimistic locking или технический claim, idempotency key и конкурентные integration tests.

### WMS-C03. Read-modify-write остатков допускает lost update и overselling

**Файлы:**

- `apps/web/src/app/api/wms/operations/route.ts:182-365`
- `apps/web/src/app/api/wms/transfers/route.ts:350-379`
- `apps/web/src/app/api/wms/transfers/[id]/dispatch/route.ts:52-85`
- `apps/web/src/app/api/wms/transfers/[id]/receive/route.ts:83-109`
- `apps/web/src/app/api/wms/transfers/[id]/reject/route.ts:77-103`

Изменения выполняются как `findUnique -> Number(decimal) -> вычисление -> update absolute value`. Две транзакции могут прочитать один остаток и успешно провести несовместимые операции.

Пример: при остатке `10` два списания по `7` оба проходят проверку и оба записывают `3`. В журнале проведено `14`, но баланс отражает только одно списание.

**Требование:** conditional decrement с `quantity >= requested`, DB-level `increment/decrement`, проверка affected rows и controlled `409 Conflict`.

### WMS-C04. Инвентаризация затирает движения после snapshot

**Файлы:**

- `apps/web/src/app/api/wms/inventories/route.ts:59-85`
- `apps/web/src/app/api/wms/inventories/[id]/route.ts:131-178`
- `apps/web/src/app/wms/inventory/[id]/page.tsx:158-180`

При создании акта фиксируется expected quantity, но складские операции не блокируются и версии остатков не сохраняются. При завершении `StockItem.quantity` безусловно заменяется `actualQty` из старого акта.

Сценарий: inventory создан при `100`, затем выполнен приход `+20`, после чего закрытие акта с `actual=100` удаляет законный приход из текущего баланса.

**Требование:** блокировка движений на время inventory либо version/cutoff-модель с возвратом `409` при изменении snapshot.

### WMS-C05. Пустые и отрицательные фактические количества портят остатки

**Файлы:**

- `apps/web/src/app/wms/inventory/[id]/page.tsx:118-123`
- `apps/web/src/app/wms/inventory/[id]/page.tsx:400-414`
- `apps/web/src/app/api/wms/inventories/[id]/route.ts:109-127`
- `apps/web/src/app/api/wms/inventories/[id]/route.ts:210-227`

Frontend превращает очищенное поле в `0`, а отрицательные значения не запрещены. API использует `Number(item.actualQty)` без `Number.isFinite` и проверки `>= 0`.

**Воздействие:** случайное обнуление или отрицательный `StockItem.quantity`.

**Требование:** draft как `string | null`, обязательная полнота пересчёта, серверная Decimal-валидация и запрет completion при незаполненных строках.

## Высокий приоритет

### WMS-H01. Основные read endpoints раскрывают чужие склады

**Файлы:**

- `apps/web/src/app/api/wms/transfers/route.ts:24-156`
- `apps/web/src/app/api/wms/stock/route.ts:24-185`
- `apps/web/src/app/api/wms/operations/route.ts:22-78`
- `apps/web/src/app/api/wms/inventories/route.ts:17-37`
- `apps/web/src/app/api/wms/inventories/[id]/route.ts:20-58`
- `apps/web/src/app/api/wms/stats/route.ts:20-122`

В transfers вычисляется `userWarehouseIds`, но scope не добавляется к основному `where`. Произвольный `warehouseId` принимается без проверки принадлежности. Stock, operations и inventory также не имеют единого МОЛ-scope. В stats пустой список складов местами означает отсутствие фильтра и глобальные данные.

**Требование:** единый server-side warehouse access helper; пустой набор доступа должен давать пустой результат, а не глобальный scope.

### WMS-H02. Пользователь может провести inventory чужого склада

**Файлы:**

- `apps/web/src/app/api/wms/inventories/route.ts:46-92`
- `apps/web/src/app/api/wms/inventories/[id]/route.ts:71-190`

`WMS_INVENTORY_MANAGE` трактуется как право на любой склад. МОЛ склада A может создать и завершить inventory склада B, заменив его остатки.

**Требование:** admin/manage permission либо строгое `warehouse.responsibleUserId === user.userId` на list/get/create/update/complete.

### WMS-H03. Склад без МОЛ работает fail-open

**Файлы:**

- `apps/web/src/app/api/wms/transfers/route.ts:323-340`
- `apps/web/src/app/api/wms/transfers/[id]/dispatch/route.ts:40-49`
- `apps/web/src/app/api/wms/transfers/[id]/receive/route.ts:47-56`
- `apps/web/src/app/api/wms/transfers/[id]/reject/route.ts:50-72`
- `packages/auth/src/wms.test.ts:41-45`

Проверка выполняется только если `responsibleUserId` truthy. При `null` любой пользователь с operation permission получает доступ. Это противоречит правилу, описанному в тесте.

**Требование:** для non-admin отсутствие МОЛ должно запрещать mutation.

### WMS-H04. Frontend также выдаёт доступ к складам fail-open

**Файлы:**

- `apps/web/src/hooks/useWarehouseAccess.ts:64-68`
- `apps/web/src/components/wms/WmsOperationWizardDialog.tsx:196-206`
- `apps/web/src/components/wms/WmsOperationWizardDialog.tsx:297-310`

Если non-admin не назначен ни на один склад, hook возвращает все склады, а wizard выбирает первый склад предприятия.

**Требование:** возвращать `[]`, блокировать wizard и показывать `EmptyState` о неназначенном складе.

### WMS-H05. Ячейка может принадлежать другому складу

**Файлы:**

- `packages/database/prisma/schema.prisma:485-498`
- `packages/database/prisma/schema.prisma:653-665`
- `apps/web/src/app/api/wms/operations/route.ts:249-266`
- `apps/web/src/app/api/wms/transfers/[id]/receive/route.ts:68-109`
- `apps/web/src/app/api/wms/stock/[id]/location/route.ts:51-68`

Receipt и transfer receive записывают `cellId` без проверки `cell.zone.warehouseId`. Отдельный location endpoint такую проверку уже содержит, что подтверждает ожидаемый инвариант.

**Требование:** общий валидатор принадлежности ячейки складу во всех write paths; в будущем составной DB-инвариант.

### WMS-H06. Одна номенклатура не может корректно храниться в нескольких ячейках

**Файлы:**

- `packages/database/prisma/schema.prisma:485-498`
- `apps/web/src/app/api/wms/operations/route.ts:249-267`
- `apps/web/src/app/api/wms/transfers/[id]/receive/route.ts:83-109`

`@@unique([warehouseId, nomenclatureId])` разрешает только одну строку и один `cellId`. При приходе в новую ячейку меняется location всего накопленного остатка.

**Требование:** разделить агрегированный warehouse balance и cell-level balances либо изменить модель размещений.

### WMS-H07. Существуют две несовместимые реализации transfer

**Файлы:**

- `apps/web/src/app/api/wms/operations/route.ts:136-154`
- `apps/web/src/app/api/wms/operations/route.ts:320-365`
- `apps/web/src/app/api/wms/transfers/route.ts:246-499`

Generic `OperationType.TRANSFER` мгновенно списывает source и зачисляет target. `StockTransfer` использует `REQUESTED -> IN_TRANSIT -> COMPLETED/REJECTED`. Первый путь обходит приёмку, отклонение и state machine.

**Требование:** запретить публичный generic transfer; все межскладские движения проводить через один агрегат.

### WMS-H08. Публичный ADJUSTMENT создаёт документ без изменения остатка

**Файл:** `apps/web/src/app/api/wms/operations/route.ts:128-136,208-383`

`ADJUSTMENT` проходит enum validation и создаёт `StockOperation`, но ветки обновления остатка для него нет. Поздний recalculate внезапно применит эту запись как абсолютный баланс.

**Требование:** запретить тип в generic endpoint до определения однозначной signed semantics.

### WMS-H09. Ошибка audit/notification после commit возвращает ложный failure

**Файлы:**

- `apps/web/src/app/api/wms/operations/route.ts:182-427`
- `apps/web/src/app/api/wms/transfers/route.ts:350-505`
- `apps/web/src/app/api/wms/inventories/[id]/route.ts:109-243`

Основная транзакция уже commit-нута, затем падает audit или notification, а клиент получает ошибку. Повтор запроса способен провести движение второй раз.

**Требование:** idempotency key, audit в основной транзакции либо outbox; notification failure не должен менять результат основной операции.

### WMS-H10. Inventory можно завершить без фактического пересчёта

**Файл:** `apps/web/src/app/api/wms/inventories/route.ts:77-83`

При создании `actualQty` автоматически равен `expectedQty`, хотя схема допускает `null`. Непосчитанная строка неотличима от подтверждённой.

**Требование:** `actualQty = null`, `diffQty = null`; completion только после заполнения всех обязательных строк.

### WMS-H11. Повторное завершение inventory не защищено атомарно

**Файл:** `apps/web/src/app/api/wms/inventories/[id]/route.ts:81-190`

Статус проверяется до транзакции, update не содержит expected status. Два запроса могут создать две adjustment operations.

**Требование:** compare-and-set по `IN_PROGRESS`, unique relation `StockOperation.inventoryId` либо idempotency key.

### WMS-H12. Исторические документы удаляются cascade

**Файл:** `packages/database/prisma/schema.prisma:426-662`

Удаление warehouse или nomenclature каскадно удаляет operations, inventories и transfers. Это уничтожает аудиторскую трассу и делает ledger неполным.

**Требование:** `Restrict`/soft delete для master data и immutable snapshots в документах. Миграцию только подготовить и проверить локально; не применять к VPS в рамках исправления кода.

### WMS-H13. Import-скрипт необратимо очищает WMS и подавляет ошибки

**Файл:** `scripts/import-wms-from-dwms.js:196-209,381-423`

Скрипт удаляет весь WMS по таблицам, каждую ошибку игнорирует и не имеет общей атомарности. Повторные source rows одной warehouse/nomenclature перезаписывают quantity вместо суммирования.

**Требование:** не запускать на действующей БД; default dry-run, explicit destructive flag, target guard, backup precondition, staging import и отсутствие silent catches.

## Ошибки frontend и интеграции

### WMS-F01. Уведомления ведут на несуществующий route

**Файлы:**

- `apps/web/src/app/api/wms/transfers/route.ts:424-434,481-491`
- `apps/web/src/app/api/wms/transfers/[id]/dispatch/route.ts:115-126`
- `apps/web/src/app/api/wms/transfers/[id]/receive/route.ts:160-171`
- `apps/web/src/app/api/wms/transfers/[id]/reject/route.ts:136-153`

Ссылки используют `/wms/transfers?mode=...`, но transfer UI находится на `/wms/operations?tab=transfers`. Страница также не синхронизирует `mode` с `transferTab`.

### WMS-F02. Drawer ведёт на неверный equipment route

**Файл:** `apps/web/src/components/wms/StockDetailDrawer.tsx:461-466`

Используется `/equipment/${id}`, тогда как detail route находится по `/eps/${id}`.

### WMS-F03. Перемещение из drawer теряет выбранную номенклатуру

**Файлы:**

- `apps/web/src/components/wms/StockDetailDrawer.tsx:429-440`
- `apps/web/src/app/wms/operations/page.tsx:182-200,1017-1028`

URL содержит `nomenclatureId`, но страница не передаёт его в `initialNomenclatureId` wizard.

### WMS-F04. Stepper обходит промежуточную validation

**Файлы:**

- `apps/web/src/components/wms/WmsOperationWizardDialog.tsx:447-495,593-604`
- `apps/web/src/components/ui/FormDialog.tsx:259-267`

Можно перейти прямо на итоговый шаг. Например, `ISSUE_EMPLOYEE` помечает получателя required, но ни wizard, ни API не требуют непустое значение.

### WMS-F05. Bulk action сообщает об успехе, но ничего не создаёт

**Файл:** `apps/web/src/app/wms/stock/page.tsx:469-471,1251-1255`

«Сформировать списание» показывает snackbar, не создавая документ и не открывая wizard.

### WMS-F06. Асинхронная загрузка stock подвержена stale response

**Файлы:**

- `apps/web/src/components/wms/WmsOperationWizardDialog.tsx:210-251`
- `apps/web/src/components/wms/TransferRequestDialog.tsx:127-162`

Медленный ответ предыдущего склада может перезаписать stock map нового склада.

### WMS-F07. Фильтры и pagination оставляют пользователя на пустой странице

**Файлы:**

- `apps/web/src/app/wms/inventory/page.tsx:189-263`
- `apps/web/src/app/wms/warehouses/page.tsx:218-349`

Page не сбрасывается при изменении фильтров. Аналогично selection stock сохраняет невидимые строки между страницами и фильтрами: `apps/web/src/app/wms/stock/page.tsx:146,392-395,631-784`.

### WMS-F08. KPI и low-stock alert считаются по текущей странице

**Файлы:**

- `apps/web/src/app/wms/operations/page.tsx:469-525`
- `apps/web/src/app/wms/stock/page.tsx:474-493`

Показатели выглядят глобальными, но основаны на загруженных 25 строках.

## Средний приоритет

1. `minStock=0` трактуется по-разному в stock, nomenclature, operations и тестах: `apps/web/src/app/api/wms/stock/route.ts:98-106`, `apps/web/src/app/api/wms/nomenclature/route.ts:47-54`, `packages/auth/src/wms.test.ts:114-140`.
2. Decimal арифметика выполняется через JS `number`, что опасно для кг/м/л: `apps/web/src/app/api/wms/operations/route.ts:200-374` и transfer routes.
3. Invalid pagination (`page=abc`) превращается в `NaN` и может вызвать ORM error: stock/operations/transfers/nomenclature list routes.
4. Soft-deleted и inactive warehouse/nomenclature участвуют в справочниках и операциях.
5. `StockTransfer.status` имеет опасный default `IN_TRANSIT`: `packages/database/prisma/schema.prisma:603-625`.
6. Нет DB-инвариантов `sourceWarehouseId != targetWarehouseId`, `quantity >= 0`, допустимых status/timestamp combinations и уникальности document items.
7. `targetCellId` нельзя явно очистить при receive из-за `||` fallback: `apps/web/src/app/api/wms/transfers/[id]/receive/route.ts:70-80`.
8. Mutating WMS routes используют `getCurrentUser`, обходя CSRF-проверку из `requireAuth`.
9. Permission model topology/nomenclature применяется непоследовательно.
10. XLSX export фактически создаёт CSV: stock page и `InventoryCountSheetDialog`.

## Тестовое покрытие

`packages/auth/src/wms.test.ts` определяет локальные симуляции бизнес-правил. `apps/web/src/lib/__tests__/wms-transfers.test.ts` повторяет несколько выражений production-кода, но не вызывает route handlers и не проверяет транзакции.

Критически отсутствуют:

- route-level RBAC/MOL tests;
- concurrent dispatch/receive/reject tests;
- concurrent issue/receipt tests;
- stale inventory completion tests;
- cross-warehouse cell tests;
- recalculate equivalence tests;
- Decimal and invalid-number tests;
- idempotency and post-commit failure tests;
- frontend tests пустых inventory values, wizard validation и URL deep links;
- E2E flow request -> dispatch -> receive/reject.

## Решение о выпуске

До устранения WMS-C01..WMS-C05 и WMS-H01..WMS-H11 модуль не должен считаться надёжным материальным контуром. Особенно запрещено использовать recalculate как способ исправления данных: текущий алгоритм сам является источником расхождений.
