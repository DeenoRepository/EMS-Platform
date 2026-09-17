#!/usr/bin/env node
/**
 * Скрипт пересчета остатков StockItem из журнала StockOperation.
 * По умолчанию отключен. Legacy preview намеренно не реализован:
 * неподдерживаемые события требуют отдельного read-only аудита.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.error('❌ Legacy recalculation is disabled. Use scripts/wms-legacy-audit.js --read-only on an isolated local database.');
  process.exitCode = 2;
  return;

  const operations = await prisma.stockOperation.findMany({
    include: {
      items: {
        include: { nomenclature: true },
      },
      warehouse: true,
    },
    orderBy: { date: 'asc' },
  });

  console.log(`📋 Найдено операций в истории: ${operations.length}`);

  const balances = new Map();
  const violations = [];

  for (const op of operations) {
    for (const item of op.items) {
      const key = `${op.warehouseId}__${item.nomenclatureId}`;
      const current = balances.get(key) || {
        warehouseId: op.warehouseId,
        warehouseName: op.warehouse?.name || op.warehouseId,
        nomenclatureId: item.nomenclatureId,
        nomenclatureName: item.nomenclature?.name || item.nomenclatureId,
        quantity: 0,
      };

      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        violations.push({ operationId: op.id, itemId: item.id, reason: 'INVALID_QUANTITY' });
        continue;
      }

      if (op.type === 'RECEIPT') {
        current.quantity += qty;
      } else if (op.type === 'ISSUE' || op.type === 'ISSUE_EMPLOYEE' || op.type === 'ISSUE_WRITE_OFF') {
        current.quantity -= qty;
        if (current.quantity < 0) {
          violations.push({ operationId: op.id, itemId: item.id, reason: 'NEGATIVE_INTERMEDIATE_BALANCE' });
        }
      } else {
        violations.push({ operationId: op.id, itemId: item.id, reason: 'UNSUPPORTED_LEGACY_EVENT', type: op.type });
        continue;
      }

      balances.set(key, current);
    }
  }

  if (violations.length > 0) {
    console.error(`\n❌ Preview остановлен: найдено нарушений журнала: ${violations.length}`);
    for (const violation of violations) console.error(JSON.stringify(violation));
    process.exitCode = 3;
    return;
  }

  let updatedCount = 0;
  for (const entry of balances.values()) {
    const existing = await prisma.stockItem.findUnique({
      where: {
        warehouseId_nomenclatureId: {
          warehouseId: entry.warehouseId,
          nomenclatureId: entry.nomenclatureId,
        },
      },
    });

    const currentDbQty = existing ? Number(existing.quantity) : null;
    if (currentDbQty !== entry.quantity) updatedCount++;
    console.log(
      `  ${existing ? '↔' : '➕'} [${entry.warehouseName}] «${entry.nomenclatureName}»: ` +
        `${currentDbQty === null ? 'отсутствует' : currentDbQty} -> ${entry.quantity} шт.`
    );
  }

  console.log(`\nℹ️ Read-only preview завершен. Позиций с расхождениями: ${updatedCount}. База не изменялась.`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при пересчете остатков:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
