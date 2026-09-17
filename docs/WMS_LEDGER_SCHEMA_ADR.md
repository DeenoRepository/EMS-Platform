# ADR: целевая модель журнала движений WMS

## Статус

Предложение. Документ не является разрешением на миграцию production-базы.

## Контекст

Текущие `StockItem`, `StockOperation`, `StockTransfer` и `Inventory` позволяют записать одно хозяйственное событие несколькими несовместимыми способами. `TRANSFER` перегружен, `ADJUSTMENT` не содержит однозначного знака или resulting balance, а текущая уникальность `StockItem(warehouseId, nomenclatureId)` не поддерживает несколько ячеек.

## Решение

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

## Адресное хранение

Не менять `StockItem` на уникальность с nullable `cellId` как единственное исправление. Целевая модель разделяет:

- `WarehouseStock(warehouseId, nomenclatureId, quantity)`;
- `CellStock(cellId, nomenclatureId, quantity)`.

Все cell writes проверяют, что cell принадлежит warehouse. Исторические документы не должны удаляться при удалении master data.

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

## Критерии приёмки

- один business event создаёт ровно одно движение на каждый затронутый склад;
- повтор idempotency key не создаёт новое движение;
- completed transfer имеет `TRANSFER_OUT` и `TRANSFER_IN`;
- inventory adjustment хранит знак delta;
- dry-run reconciliation не изменяет БД и показывает все расхождения.
