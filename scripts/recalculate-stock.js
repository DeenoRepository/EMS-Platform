#!/usr/bin/env node
/**
 * Скрипт пересчета остатков StockItem из журнала StockOperation.
 * Запуск на сервере:
 *   cd /opt/ems-platform && node scripts/recalculate-stock.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Запуск пересчета остатков ТМЦ на основе журнала операций...');

  const [allWarehouses, operations] = await Promise.all([
    prisma.warehouse.findMany({ select: { id: true, name: true, code: true } }),
    prisma.stockOperation.findMany({
      include: {
        items: {
          include: { nomenclature: true },
        },
        warehouse: true,
      },
      orderBy: { date: 'asc' },
    }),
  ]);

  const warehouseNameMap = new Map(allWarehouses.map((w) => [w.name.trim().toLowerCase(), w.id]));
  const warehouseMapById = new Map(allWarehouses.map((w) => [w.id, w.name]));

  console.log(`📋 Найдено складов: ${allWarehouses.length}, операций в истории: ${operations.length}`);

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
      if (op.type === 'RECEIPT') {
        current.quantity += qty;
      } else if (op.type === 'TRANSFER') {
        const isIncomingTransfer =
          op.counterparty?.startsWith('Склад-отправитель:') ||
          op.comment?.startsWith('Принято по межскладскому перемещению') ||
          op.comment?.startsWith('Принято по прямому перемещению');

        if (isIncomingTransfer) {
          current.quantity += qty;
        } else {
          current.quantity = Math.max(0, current.quantity - qty);

          // Проверяем наличие отдельной парной операции
          const hasDualIncomingRecord = operations.some(
            (otherOp) =>
              otherOp.id !== op.id &&
              otherOp.type === 'TRANSFER' &&
              otherOp.counterparty?.startsWith('Склад-отправитель:') &&
              ((op.document && otherOp.document === op.document) ||
                (Math.abs(new Date(otherOp.date).getTime() - new Date(op.date).getTime()) < 10000 &&
                  otherOp.items.some((oit) => oit.nomenclatureId === item.nomenclatureId)))
          );

          if (!hasDualIncomingRecord) {
            let legacyTargetWhId = null;
            const targetIdMatch = op.comment?.match(/Перемещение на склад ID ([a-zA-Z0-9_-]+)/);
            if (targetIdMatch && targetIdMatch[1]) {
              legacyTargetWhId = targetIdMatch[1];
            } else {
              const targetNameMatch = op.comment?.match(/Перемещение на склад "([^"]+)"/);
              if (targetNameMatch && targetNameMatch[1]) {
                const targetName = targetNameMatch[1].trim().toLowerCase();
                legacyTargetWhId = warehouseNameMap.get(targetName) || null;
              }
            }

            if (legacyTargetWhId && legacyTargetWhId !== op.warehouseId) {
              const targetKey = `${legacyTargetWhId}__${item.nomenclatureId}`;
              const targetCurrent = balances.get(targetKey) || {
                warehouseId: legacyTargetWhId,
                warehouseName: warehouseMapById.get(legacyTargetWhId) || legacyTargetWhId,
                nomenclatureId: item.nomenclatureId,
                nomenclatureName: item.nomenclature?.name || item.nomenclatureId,
                quantity: 0,
              };
              targetCurrent.quantity += qty;
              balances.set(targetKey, targetCurrent);
            }
          }
        }
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

    if (existing) {
      const currentDbQty = Number(existing.quantity);
      if (currentDbQty !== entry.quantity) {
        await prisma.stockItem.update({
          where: { id: existing.id },
          data: { quantity: entry.quantity },
        });
        console.log(`  ✅ [${entry.warehouseName}] «${entry.nomenclatureName}»: ${currentDbQty} -> ${entry.quantity} шт.`);
        updatedCount++;
      } else {
        console.log(`  ✓ [${entry.warehouseName}] «${entry.nomenclatureName}»: остаток уже актуален (${entry.quantity} шт.)`);
      }
    } else {
      await prisma.stockItem.create({
        data: {
          warehouseId: entry.warehouseId,
          nomenclatureId: entry.nomenclatureId,
          quantity: entry.quantity,
        },
      });
      console.log(`  ➕ [${entry.warehouseName}] «${entry.nomenclatureName}»: создана запись остатка (${entry.quantity} шт.)`);
      updatedCount++;
    }
  }

  console.log(`\n🎉 Пересчет завершен! Всего позиций: ${balances.size}, обновлено: ${updatedCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при пересчете остатков:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
