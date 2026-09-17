#!/usr/bin/env node
/**
 * Скрипт пересчета остатков StockItem из журнала StockOperation.
 * По умолчанию выполняет только read-only preview.
 * Режим --apply намеренно не реализован до внедрения проверяемого ledger.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes('--dry-run')) {
    console.error('❌ Пересчет отключен: используйте только явный --dry-run до внедрения нового ledger.');
    process.exitCode = 2;
    return;
  }

  console.log('🔄 Запуск пересчета остатков ТМЦ на основе журнала операций...');

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
      if (op.type === 'RECEIPT' || op.type === 'TRANSFER') {
        current.quantity += qty;
      } else if (op.type === 'ISSUE' || op.type === 'ISSUE_EMPLOYEE' || op.type === 'ISSUE_WRITE_OFF') {
        current.quantity = Math.max(0, current.quantity - qty);
      } else if (op.type === 'ADJUSTMENT') {
        current.quantity = qty;
      }

      balances.set(key, current);
    }
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
