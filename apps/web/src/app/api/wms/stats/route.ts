import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const [warehousesCount, nomenclatureCount, stockItems, recentOperations, inventoriesCount] = await Promise.all([
      prisma.warehouse.count({ where: { isActive: true } }),
      prisma.nomenclature.count(),
      prisma.stockItem.findMany({
        include: {
          nomenclature: {
            select: { minStock: true, name: true, unit: true },
          },
          warehouse: {
            select: { name: true, code: true },
          },
        },
      }),
      prisma.stockOperation.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        include: {
          warehouse: { select: { name: true, code: true } },
          createdBy: { select: { displayName: true } },
          items: {
            include: {
              nomenclature: { select: { name: true, unit: true } },
              equipment: { select: { name: true, inventoryNumber: true } },
            },
          },
        },
      }),
      prisma.inventory.count({ where: { status: 'IN_PROGRESS' } }),
    ]);

    // Вычисляем дефицитные позиции
    const lowStockItems = stockItems
      .filter((si) => {
        const minStock = si.nomenclature.minStock !== null ? Number(si.nomenclature.minStock) : null;
        return minStock !== null && Number(si.quantity) <= minStock;
      })
      .map((si) => ({
        id: si.id,
        name: si.nomenclature.name,
        warehouseName: si.warehouse.name,
        warehouseCode: si.warehouse.code,
        quantity: Number(si.quantity),
        minStock: Number(si.nomenclature.minStock),
        unit: si.nomenclature.unit,
      }));

    return NextResponse.json({
      success: true,
      data: {
        warehousesCount,
        nomenclatureCount,
        stockItemsCount: stockItems.length,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.slice(0, 10),
        activeInventoriesCount: inventoriesCount,
        recentOperations,
      },
    });
  } catch (error: any) {
    console.error('Ошибка получения статистики WMS:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения статистики WMS' }, { status: 500 });
  }
}
