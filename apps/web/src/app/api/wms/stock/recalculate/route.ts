import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_OPERATIONS_CREATE) && !user.roles.includes('admin')) {
      return forbiddenResponse();
    }

    // 1. Получаем все складские операции с элементами
    const operations = await prisma.stockOperation.findMany({
      include: {
        items: true,
      },
      orderBy: { date: 'asc' },
    });

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
  } catch (error: any) {
    console.error('Ошибка пересчета остатков:', error);
    return NextResponse.json({ success: false, error: 'Ошибка пересчета остатков' }, { status: 500 });
  }
}
