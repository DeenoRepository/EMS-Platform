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

    const isAdmin =
      user.roles.includes('admin') ||
      hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    let userWarehouseIds: string[] = [];
    if (!isAdmin) {
      const userWhs = await prisma.warehouse.findMany({
        where: { responsibleUserId: user.userId, isActive: true },
        select: { id: true },
      });
      userWarehouseIds = userWhs.map((w) => w.id);
    }

    const [
      warehousesCount,
      nomenclatureCount,
      stockItemsCount,
      recentOperations,
      inventoriesCount,
      deficitStats,
    ] = await Promise.all([
      prisma.warehouse.count({ where: { isActive: true } }),
      prisma.nomenclature.count(),
      prisma.stockItem.count(),
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
      prisma.inventory.count({
        where: {
          status: 'IN_PROGRESS',
          ...(isAdmin || userWarehouseIds.length === 0 ? {} : { warehouseId: { in: userWarehouseIds } }),
        },
      }),
      // Оптимизированный запрос дефицитных позиций
      prisma.stockItem.findMany({
        where: {
          nomenclature: { minStock: { not: null } },
          ...(isAdmin || userWarehouseIds.length === 0 ? {} : { warehouseId: { in: userWarehouseIds } }),
        },
        include: {
          nomenclature: { select: { minStock: true, name: true, unit: true } },
          warehouse: { select: { name: true, code: true } },
        },
      }).then((items) =>
        items
          .filter((si) => si.nomenclature.minStock !== null && Number(si.quantity) <= Number(si.nomenclature.minStock))
          .map((si) => ({
            id: si.id,
            name: si.nomenclature.name,
            warehouseName: si.warehouse.name,
            warehouseCode: si.warehouse.code,
            quantity: Number(si.quantity),
            minStock: Number(si.nomenclature.minStock),
            unit: si.nomenclature.unit,
          }))
      ),
    ]);

    const lowStockItems = deficitStats || [];

    return NextResponse.json({
      success: true,
      data: {
        warehousesCount,
        nomenclatureCount,
        stockItemsCount,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.slice(0, 10),
        activeInventoriesCount: inventoriesCount,
        recentOperations,
        userWarehouseIds,
      },
    });
  } catch (error: any) {
    console.error('Ошибка получения статистики WMS:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения статистики WMS' }, { status: 500 });
  }
}
