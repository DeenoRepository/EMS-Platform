import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 5, windowMs: 60 * 1000, prefix: 'wms-stock-recalculate' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE) && !user.roles.includes('admin') && !user.roles.includes('administrator')) {
      return forbiddenResponse();
    }

    // 1. Получаем все склады и все складские операции с элементами
    const [allWarehouses, operations] = await Promise.all([
      prisma.warehouse.findMany({ select: { id: true, name: true, code: true } }),
      prisma.stockOperation.findMany({
        include: {
          items: true,
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    const warehouseNameMap = new Map(allWarehouses.map((w) => [w.name.trim().toLowerCase(), w.id]));

    // 2. Рассчитываем баланс для каждой пары (warehouseId, nomenclatureId)
    const balances = new Map<string, { warehouseId: string; nomenclatureId: string; quantity: number }>();

    for (const op of operations) {
      for (const item of op.items) {
        const key = `${op.warehouseId}__${item.nomenclatureId}`;
        const current = balances.get(key) || {
          warehouseId: op.warehouseId,
          nomenclatureId: item.nomenclatureId,
          quantity: 0,
        };

        const qty = Number(item.quantity);
        if (op.type === 'RECEIPT') {
          current.quantity += qty;
        } else if (op.type === 'TRANSFER') {
          // TRANSFER:
          // Входящие перемещения увеличивают остаток на op.warehouseId:
          // - counterparty начинается с "Склад-отправитель:"
          // - comment начинается с "Принято по межскладскому перемещению" или "Принято по прямому перемещению"
          const isIncomingTransfer =
            op.counterparty?.startsWith('Склад-отправитель:') ||
            op.comment?.startsWith('Принято по межскладскому перемещению') ||
            op.comment?.startsWith('Принято по прямому перемещению');

          if (isIncomingTransfer) {
            current.quantity += qty;
          } else {
            // Исходящее перемещение - списываем с отправителя op.warehouseId
            current.quantity = Math.max(0, current.quantity - qty);

            // Проверяем, существует ли отдельная входящая операция для этого перемещения
            const hasDualIncomingRecord = operations.some(
              (otherOp) =>
                otherOp.id !== op.id &&
                otherOp.type === 'TRANSFER' &&
                otherOp.counterparty?.startsWith('Склад-отправитель:') &&
                ((op.document && otherOp.document === op.document) ||
                  (Math.abs(new Date(otherOp.date).getTime() - new Date(op.date).getTime()) < 10000 &&
                    otherOp.items.some((oit) => oit.nomenclatureId === item.nomenclatureId)))
            );

            // Зачисляем на целевой склад только если парная операция отсутствует (легаси)
            if (!hasDualIncomingRecord) {
              let legacyTargetWhId: string | null = null;
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
                  nomenclatureId: item.nomenclatureId,
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

    // 3. Синхронизируем StockItem в базе данных
    let updatedCount = 0;
    for (const entry of Array.from(balances.values())) {
      const existing = await prisma.stockItem.findUnique({
        where: {
          warehouseId_nomenclatureId: {
            warehouseId: entry.warehouseId,
            nomenclatureId: entry.nomenclatureId,
          },
        },
      });

      if (existing) {
        if (Number(existing.quantity) !== entry.quantity) {
          await prisma.stockItem.update({
            where: { id: existing.id },
            data: { quantity: entry.quantity },
          });
          updatedCount++;
        }
      } else {
        await prisma.stockItem.create({
          data: {
            warehouseId: entry.warehouseId,
            nomenclatureId: entry.nomenclatureId,
            quantity: entry.quantity,
          },
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Остатки успешно пересчитаны из истории операций. Обновлено позиций: ${updatedCount}`,
      data: {
        totalPositions: balances.size,
        updatedPositions: updatedCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка пересчета остатков:', message);
    return NextResponse.json({ success: false, error: 'Ошибка пересчета остатков', details: message }, { status: 500 });
  }
}
