# ADR: целевая модель журнала движений WMS

## Статус

Предложение. Документ не является разрешением на миграцию production-базы.

## Контекст

Текущие `StockItem`, `StockOperation`, `StockTransfer` и `Inventory` позволяют записать одно хозяйственное событие несколькими несовместимыми способами. `TRANSFER` перегружен, `ADJUSTMENT` не содержит однозначного знака или resulting balance, а текущая уникальность `StockItem(warehouseId, nomenclatureId)` не поддерживает несколько ячеек.

## Решение

### Утвержденные бизнес-правила

- Товар в пути сохраняется в учете как активный резерв: доступный остаток source уменьшается, а `reserved/in_transit` увеличивается.
- В таблице отдельно показываются `availableQuantity`, `reservedQuantity` и `totalOwnedQuantity`.
- `dispatch` создает резерв, `receive` закрывает резерв и создает приход target, `reject` освобождает резерв и возвращает количество в доступный остаток source.
- При активной inventory новые складские операции запрещены. Закрытие акта блокируется при любом изменении snapshot.
- Одна номенклатура может одновременно находиться в нескольких ячейках одного склада.
- Склад без МОЛ допустим. Операция на такой склад получает статус ожидания подтверждения назначенным впоследствии МОЛ.
- Warehouse и Nomenclature физически не удаляются: используется архивирование, исторические документы сохраняются.

Ввести immutable movement ledger с явным signed delta:

| Событие | Склад | Delta |
|---|---|---:|
| `RECEIPT` | получающий | `+quantity` |
| `ISSUE` | выдающий | `-quantity` |
| `TRANSFER_OUT` | source | `-quantity` |
| `TRANSFER_IN` | target | `+quantity` |
| `ADJUSTMENT` | inventory warehouse | signed `diff` |

Каждое движение должно иметь:

- `warehouseId`, `nomenclatureId`, `deltaQuantity`;
- immutable `eventType`;
- `transferId` или `inventoryId`, когда событие относится к документу;
- уникальный `idempotencyKey`/business event key;
- `createdAt`, `createdById`;
- по возможности `quantityBefore` и `quantityAfter` для аудита.

`StockItem` остаётся materialized available balance и изменяется только через movement service. Reconciliation читает ledger и сначала формирует read-only diff.

Резерв не является списанием собственности. Вводится отдельная сущность `WmsStockReservation` с жизненным циклом `ACTIVE -> RECEIVED|RELEASED|CANCELLED`:

```text
totalOwned = available + activeReservations
available = totalOwned - activeReservations
```

## Адресное хранение

Не менять `StockItem` на уникальность с nullable `cellId` как единственное исправление. Целевая модель разделяет:

- `WarehouseStock(warehouseId, nomenclatureId, quantity)`;
- `CellStock(cellId, nomenclatureId, quantity)`.

Все cell writes проверяют, что cell принадлежит warehouse. Исторические документы не должны удаляться при удалении master data.
Для пары warehouse/nomenclature допускается несколько `CellStock` строк; `cellId = null` означает временное неадресное размещение и не должен переносить существующий остаток между ячейками.

## Миграционный порядок

1. Read-only audit текущих данных и классификация legacy operations.
2. Добавление новых nullable ledger columns/tables без изменения старых балансов.
3. Dual-write только после проверки event mapping на test database.
4. Backfill только по подтверждённым правилам и отдельному согласованию владельца данных.
5. Сверка `ledger balance` с `StockItem` в dry-run.
6. Переключение reconciliation на ledger.
7. Только после этого удаление legacy paths и tightening constraints.

## Запреты

- Не выполнять миграцию на VPS из этого репозитория.
- Не делать автоматический backfill текущих остатков.
- Не включать apply-mode reconciliation до отдельного аудита.
- Не использовать `Math.max(0, ...)` для сокрытия отрицательной истории.
- Не считать резерв окончательным списанием: reject/cancel должны освобождать его.

## Критерии приёмки

- один business event создаёт ровно одно движение на каждый затронутый склад;
- повтор idempotency key не создаёт новое движение;
- completed transfer имеет `TRANSFER_OUT` и `TRANSFER_IN`;
- inventory adjustment хранит знак delta;
- dry-run reconciliation не изменяет БД и показывает все расхождения.
