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
      // Оптимизированный запрос дефицитных позиций (расчет по всей номенклатуре)
      prisma.nomenclature.findMany({
        where: {
          minStock: { not: null },
          deletedAt: null,
        },
        include: {
          stockItems: {
            select: {
              id: true,
              quantity: true,
              warehouseId: true,
              warehouse: { select: { name: true, code: true } },
            },
          },
        },
      }).then((noms) => {
        const deficitList: any[] = [];
        for (const nom of noms) {
          const minStock = Number(nom.minStock);
          const relevantItems = (!isAdmin && userWarehouseIds.length > 0)
            ? nom.stockItems.filter((si) => userWarehouseIds.includes(si.warehouseId))
            : nom.stockItems;

          if (!isAdmin && userWarehouseIds.length > 0 && relevantItems.length === 0) {
            continue;
          }

          // Общий остаток номенклатуры по всем складам
          const totalStock = nom.stockItems.reduce((sum, si) => sum + Number(si.quantity), 0);

          // Если общий остаток по всем складам превышает минимальный, то дефицита нет
          if (totalStock <= minStock) {
            const primaryItem = relevantItems[0] || nom.stockItems[0];
            deficitList.push({
              id: primaryItem?.id || nom.id,
              name: nom.name,
              warehouseName: nom.stockItems.length > 1 ? 'Все склады' : (primaryItem?.warehouse?.name || '—'),
              warehouseCode: nom.stockItems.length > 1 ? 'ВСЕ' : (primaryItem?.warehouse?.code || '—'),
              quantity: totalStock,
              minStock,
              unit: nom.unit,
            });
          }
        }
        return deficitList;
      }),
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
