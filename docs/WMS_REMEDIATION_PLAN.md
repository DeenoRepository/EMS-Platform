# План устранения замечаний WMS

> Исполнитель: следующий агент  
> Основание: `docs/WMS_CODE_REVIEW_2026-09-17.md`  
> Главный запрет: **не подключаться к VPS и не изменять действующую базу данных**

## Обязательные ограничения

1. Не запускать `db:push`, `db:migrate`, `db:migrate:deploy`, `db:seed`, Prisma Studio или любые команды с production `DATABASE_URL`.
2. Не запускать `scripts/recalculate-stock.js`, `scripts/import-wms-from-dwms.js` и `scripts/fix-wms-unnamed-nomenclature.js` против действующей БД.
3. Не вызывать `POST /api/wms/stock/recalculate` на VPS.
4. Все integration/concurrency проверки выполнять только на одноразовой локальной test database с отдельно заданным `DATABASE_URL`.
5. Допускается подготовить Prisma schema и migration SQL в репозитории, но не применять их к VPS. Deployment должен быть отдельной задачей с backup, dry-run и явным подтверждением владельца системы.
6. Каждый этап выполнять отдельным Conventional Commit. Не смешивать P0 safety fixes, schema redesign и UI cleanup.
7. Не пытаться автоматически «лечить» существующие остатки до появления проверяемого ledger и отдельного reconciliation report.

## Целевая последовательность

### Этап 0. Safety containment без изменения схемы

**Цель:** немедленно исключить наиболее опасные действия на уровне кода.

Изменения:

1. Убрать кнопку «Синхронизация» из `apps/web/src/app/wms/stock/page.tsx` либо показывать блокирующее сообщение без вызова API.
2. Закрыть `/api/wms/stock/recalculate` отдельным admin permission/feature flag и возвращать `503`, пока новый ledger не готов.
3. Добавить предупреждение и hard guard в `scripts/recalculate-stock.js` и destructive import/fix scripts: default dry-run, отсутствие fallback `DATABASE_URL`, explicit confirmation flag.
4. Запретить `OperationType.TRANSFER` и `OperationType.ADJUSTMENT` в публичном `POST /api/wms/operations` с controlled `400` до появления единой доменной реализации.
5. Исправить ложные notification links на `/wms/operations?tab=transfers&mode=...`.
6. Исправить `/equipment/:id` на `/eps/:id`.

Проверки:

- unit tests, что recalculate и generic transfer/adjustment недоступны;
- navigation tests для notification и equipment links;
- `pnpm test`, lint/typecheck доступного scope.

Коммит: `fix(wms): block unsafe stock maintenance paths`

### Этап 1. Единый warehouse access guard

**Цель:** закрыть cross-warehouse read/write доступ до изменения учётной модели.

Изменения:

1. Создать небольшой production helper, который возвращает admin scope либо IDs складов, где `responsibleUserId === user.userId`.
2. Отдельный helper должен проверять mutation access к конкретному складу и работать fail-closed при `responsibleUserId = null`.
3. Применить scope к:
   - transfers list и counters;
   - stock list;
   - operations list;
   - inventories list/get/create/update/complete;
   - stats и recent operations;
   - warehouse dictionaries, где список должен быть scoped.
4. Переданный query `warehouseId` проверять на принадлежность разрешённому набору.
5. Перевести mutating handlers на `requireAuth` для использования общей CSRF-проверки.
6. Исправить `useWarehouseAccess`: non-admin без склада получает `[]`.
7. Убрать fallback `warehouses[0]` из operation/transfer dialogs.

Проверки:

- admin видит все склады;
- МОЛ A не читает и не изменяет B;
- пользователь без склада получает пустые списки и 403 на mutations;
- склад без МОЛ закрыт для non-admin;
- произвольный `warehouseId` не обходит scope;
- CSRF tests для всех mutating WMS handlers.

Коммит: `fix(wms): enforce warehouse-scoped access`

### Этап 2. Валидация входных данных и frontend fail-safe

**Цель:** исключить отрицательные, пустые и нечисловые количества без schema migration.

Изменения:

1. Ввести общие Zod-схемы WMS payloads.
2. Количество движения: finite Decimal, строго `> 0`, ограниченная precision/scale.
3. Остаток и `minStock`: finite Decimal, `>= 0`.
4. Inventory draft должен хранить пустое значение как `null`, не как `0`.
5. Перед completion требовать фактическое значение по всем обязательным строкам.
6. `ISSUE_EMPLOYEE` должен требовать непустого получателя и на frontend, и на API.
7. Отклонять duplicate `nomenclatureId` в одном document либо нормализовать строки до одной позиции.
8. Исправить pagination parser, чтобы invalid input давал default/400, а не `NaN`.
9. Прекратить возвращать неизвестные internal `error.message` клиенту.

Проверки:

- отрицательные, empty, `NaN`, `Infinity`, excessive scale;
- незаполненный inventory не завершается;
- invalid pagination не даёт 500;
- duplicate items обрабатываются однозначно;
- recipient обязателен.

Коммит: `fix(wms): validate quantities and operation payloads`

### Этап 3. Атомарные остатки и идемпотентность

**Цель:** убрать lost update и повторное проведение запроса.

Изменения:

1. Вынести stock mutation в production service, используемый operations и transfers.
2. Списание выполнять conditional decrement с проверкой affected rows.
3. Приход выполнять DB-level increment; race при создании отсутствующей строки обрабатывать через controlled retry/upsert.
4. Не выполнять арифметику Decimal через JS `number`.
5. Ввести request idempotency key для stock mutations.
6. Audit писать в той же транзакции, если технически возможно.
7. Notification вынести в transactional outbox либо сделать post-commit failure некритическим для HTTP response.

Проверки на локальной test DB:

- два issue по `7` при остатке `10`: один success, один conflict, итог `3`;
- параллельные receipt `5` и `7` к `10`: итог `22`;
- повтор idempotency key не изменяет остаток второй раз;
- notification failure не превращает committed operation в HTTP failure.

Коммит: `fix(wms): make stock mutations atomic and idempotent`

### Этап 4. Атомарная transfer state machine

**Цель:** гарантировать единственный допустимый переход и единственное движение товара.

Изменения:

1. Вынести transitions в production service.
2. Для каждого перехода выполнять compare-and-set внутри транзакции:
   - `REQUESTED -> IN_TRANSIT`;
   - `REQUESTED -> REJECTED`;
   - `IN_TRANSIT -> COMPLETED`;
   - `IN_TRANSIT -> REJECTED`.
3. Возвращать `409 Conflict`, если expected status уже изменён.
4. Использовать atomic stock service этапа 3.
5. Валидировать все `cellAllocations`: item принадлежит transfer, cell существует и относится к target warehouse.
6. Поддержать явный `targetCellId = null`, не используя `||` fallback.
7. Определить судьбу `CANCELLED`: реализовать полный transition с metadata либо удалить из публичного контракта.

Проверки на локальной test DB:

- два parallel dispatch;
- два parallel receive;
- два parallel reject;
- receive одновременно с reject;
- ровно один transition успешен и ровно одно движение создано;
- cross-warehouse cell возвращает 400;
- явная очистка cell сохраняет null.

Коммит: `fix(wms): enforce atomic transfer transitions`

### Этап 5. Безопасная inventory state machine

**Цель:** исключить фиктивный пересчёт и потерю движений после snapshot.

До реализации выбрать и зафиксировать один вариант:

- блокировать складские движения на время active inventory;
- либо сохранять stock versions/cutoff и возвращать conflict при изменениях;
- либо учитывать движения после cutoff при вычислении adjustment.

Предпочтительный минимальный вариант: optimistic version/cutoff с `409`.

Изменения:

1. Новые inventory items создаются с `actualQty = null`, `diffQty = null`.
2. Запретить несколько active inventories одного склада.
3. Completion claim выполнять атомарно из `IN_PROGRESS`.
4. Проверять изменение stock после snapshot и не применять stale values.
5. Создавать adjustment только после успешной проверки snapshot.
6. Связать adjustment operation с inventory уникальной ссылкой на этапе schema redesign.

Проверки:

- partial count не завершается;
- concurrent movement после snapshot даёт 409 и не меняет stock;
- два completion создают ровно одну adjustment operation;
- shortage и surplus сохраняют знак и корректный resulting balance.

Коммит: `fix(wms): protect inventory reconciliation`

### Этап 6. Проектирование однозначного ledger

**Цель:** сделать историю достаточной для проверки и восстановления баланса.

Архитектурное решение должно устранить перегруженный `TRANSFER` и неоднозначный `ADJUSTMENT`.

Рекомендуемая модель движения:

```text
RECEIPT       +qty
ISSUE         -qty
TRANSFER_OUT  -qty
TRANSFER_IN   +qty
ADJUSTMENT    signed delta
```

Необходимые связи:

- movement -> `transferId` для source/target записей;
- movement -> `inventoryId` для adjustment;
- уникальность движения по business event;
- immutable signed delta;
- optional `quantityBefore`/`quantityAfter` для аудита;
- idempotency key.

До написания миграции:

1. Подготовить ADR с выбранной моделью.
2. Написать pure reconciliation engine и fixture tests.
3. Проверить, что receipt -> issue -> transfer -> inventory воспроизводит ожидаемый баланс.
4. Предусмотреть in-transit quantity отдельно от available stock.

Миграционные ограничения:

- создать migration files локально;
- проверить их на копии/одноразовой test DB;
- не выполнять deploy migration на VPS;
- не backfill существующие данные автоматически без отдельного read-only audit report.

Коммиты:

- `docs(wms): define stock ledger model`
- `feat(wms): add immutable stock movements`

### Этап 7. Адресное хранение и DB-инварианты

**Цель:** отделить складской баланс от физического размещения.

Рекомендуемая модель:

- агрегат `WarehouseStock(warehouseId, nomenclatureId, quantity)`;
- размещение `CellStock(cellId, nomenclatureId, quantity)`;
- сумма cell balances не превышает/соответствует warehouse balance по утверждённому правилу.

Подготовить constraints:

- non-negative quantities;
- positive document movement quantities;
- `sourceWarehouseId != targetWarehouseId`;
- cell принадлежит тому же warehouse;
- уникальность document item или явно поддерживаемые партии;
- status/timestamp lifecycle constraints;
- `Restrict` вместо cascade для исторических документов;
- безопасный default transfer status либо отсутствие default.

Важно: применение constraints к существующей production data потребует предварительного read-only integrity report и отдельного окна внедрения. В рамках задачи агента только schema/migration preparation и local verification.

Коммит: `refactor(wms): enforce stock data invariants`

### Этап 8. Новый reconciliation вместо destructive recalculate

**Цель:** сначала обнаруживать расхождения, а не изменять данные.

Первая версия должна быть только read-only dry-run:

1. Рассчитать expected balances по immutable ledger.
2. Сравнить с current balances.
3. Вывести diff с movement IDs и integrity violations.
4. Остановиться при отрицательном промежуточном балансе.
5. Не менять `StockItem`.

Apply mode проектировать отдельно:

- только admin permission;
- rate limit и distributed/single-flight lock;
- обязательный backup precondition;
- immutable audit record;
- atomic application;
- explicit confirmation конкретного diff;
- запуск на production только после отдельного согласования.

Коммит: `feat(wms): add read-only stock reconciliation report`

### Этап 9. Frontend consistency и UX

Изменения:

1. Синхронизировать `tab` и `mode` страницы operations с URL.
2. Передавать `nomenclatureId` в wizard из stock drawer.
3. Запретить переход Stepper вперёд без полной validation.
4. Реализовать bulk write-off либо удалить ложное действие.
5. Защитить stock fetch через `AbortController`/request token.
6. Сбрасывать/clamp pagination при фильтрах.
7. Определить selection как page-local либо global и реализовать последовательно.
8. Перенести stock sorting на API до pagination.
9. Получать KPI и low-stock counts с сервера, а не по текущей странице.
10. Исправить shared UI violations: `StatusBadge`, semantic theme tokens, read-only topology UI.
11. Называть CSV экспортом CSV либо генерировать настоящий XLSX.

Коммит: `fix(wms): align warehouse workflows and navigation`

### Этап 10. Полный набор тестов

Обязательные уровни:

1. Unit tests production domain services, а не локальных функций в test-файле.
2. Route integration tests с локальной test DB.
3. Concurrency tests с отдельными соединениями/transactions.
4. RTL tests для wizard, transfer dialogs и inventory count.
5. Playwright E2E для МОЛ A/B и полного transfer lifecycle.

Минимальный release gate:

- все P0/P1 regression tests зелёные;
- concurrency tests воспроизводимо проходят сериями;
- recalculate остаётся недоступным, пока dry-run ledger reconciliation не доказан;
- нет подключения к production database в test configuration;
- migration deploy не входит в автоматическую команду проверки.

Коммит: `test(wms): cover stock integrity and concurrency`

## Критерии готовности

Работу нельзя считать завершённой, пока не выполнены все условия:

1. Один business event изменяет stock не более одного раза.
2. Не существует публичного пути обхода transfer state machine.
3. МОЛ не читает и не изменяет чужой склад.
4. Пользователь без склада не получает глобальный доступ.
5. Inventory не может затереть движение после snapshot.
6. Пустые, отрицательные и non-finite quantities отклоняются.
7. Cell всегда принадлежит warehouse остатка.
8. Ledger однозначно выражает направление каждого движения.
9. Read-only reconciliation воспроизводит баланс на fixtures.
10. Ни один шаг разработки не изменяет действующую БД на VPS.
