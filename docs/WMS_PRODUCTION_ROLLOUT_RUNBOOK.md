# WMS rollout runbook

Этот документ описывает подготовку полного WMS-релиза. Он не разрешает подключение к VPS, миграцию production database или backfill.

## Что уже реализовано в коде

- `availableQuantity`, `reservedQuantity`, `totalOwnedQuantity`.
- Резерв создаётся при dispatch/direct shipment, а не при создании запроса.
- `receive` закрывает резерв после назначения МОЛ target warehouse.
- `reject` освобождает резерв и возвращает доступное количество source warehouse.
- Во время active inventory операции отклоняются с `409`.
- `StockCellBalance` позволяет одной номенклатуре находиться в нескольких ячейках.
- Warehouse, nomenclature, zone и cell архивируются, физическое удаление не используется.
- Pending transfer без МОЛ отображается как `PENDING_RESPONSIBLE_CONFIRMATION`.
- Небезопасный legacy recalculation отключён.

## Обязательные артефакты перед production migration

1. Backup production database.
2. Проверенный restore backup на отдельном PostgreSQL instance.
3. Изолированная копия production schema и данных.
4. Baseline Prisma migration, созданный после сравнения фактической схемы и `schema.prisma`.
5. Read-only legacy audit report.
6. Таблица решений по каждому ambiguous `TRANSFER`/`ADJUSTMENT`.
7. Rollback plan для schema и application release.

## Изолированный audit

Команда разрешена только на локальной копии БД:

```bash
WMS_AUDIT_ALLOW_LOCAL=1 \
DATABASE_URL='postgresql://audit_user:secret@127.0.0.1:5432/ems_wms_copy' \
node scripts/wms-legacy-audit.js \
  --read-only \
  --output /tmp/wms-legacy-audit.json
```

Audit должен завершиться до любой миграции. Он не имеет режима записи и отказывается от удалённых database hosts.

## Migration sequence on isolated copy

1. Restore copy and record row counts/checksums for WMS tables.
2. Run the read-only audit.
3. Review all violations and approve manual mapping.
4. Apply the generated migration only to the isolated copy.
5. Backfill only approved deterministic records.
6. Recalculate expected balances from the new signed ledger in dry-run mode.
7. Compare before/after quantities, reserves and cell balances.
8. Run route, concurrency and E2E tests.
9. Test rollback on a disposable copy.

## Production change window

Production execution is a separate operator-approved task and is not part of this repository change. During that task:

- stop deploy automation that runs `db push` or unreviewed migrations;
- take and verify a backup;
- run the exact migration checksum approved from the isolated copy;
- enable the new WMS feature flag only after schema verification;
- keep legacy recalculation disabled;
- run read-only reconciliation first;
- monitor transfer, inventory and reservation errors;
- retain the rollback path until the observation window closes.

## Explicit prohibitions

- Never run `prisma db push` against production.
- Never run `prisma migrate dev` against production.
- Never run `scripts/recalculate-stock.js`.
- Never run import/fix scripts against production as part of deployment.
- Never backfill ambiguous legacy transfer or adjustment records automatically.
- Never apply `docs/WMS_LEDGER_MIGRATION_DRAFT.sql` directly without converting it into a reviewed migration against the confirmed baseline.
