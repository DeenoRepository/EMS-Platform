import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, StockTransferStatus } from '@ems/database';
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
      inTransitTransfersCount,
      deficitStats,
    ] = await Promise.all([
      prisma.warehouse.count({ where: { isActive: true } }),
      prisma.nomenclature.count({ where: { deletedAt: null } }),
      prisma.stockItem.count(),
      prisma.stockOperation.findMany({
        take: 6,
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
      prisma.stockTransfer.count({
        where: { status: StockTransferStatus.IN_TRANSIT },
      }),
      // Агрегация объемов ТМЦ в пути для точного учета реального дефицита
      Promise.all([
        prisma.nomenclature.findMany({
          where: {
            minStock: { gt: 0 },
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
        }),
        prisma.stockTransferItem.findMany({
          where: {
            transfer: {
              status: StockTransferStatus.IN_TRANSIT,
            },
          },
          select: {
            nomenclatureId: true,
            quantity: true,
            transfer: {
              select: {
                sourceWarehouseId: true,
                targetWarehouseId: true,
              },
            },
          },
        }),
      ]).then(([noms, transitItems]) => {
        // Карта транзита по номенклатуре:
        // globalTransitMap: nomenclatureId -> общее кол-во в пути по предприятию
        const globalTransitMap = new Map<string, number>();
        for (const ti of transitItems) {
          const prev = globalTransitMap.get(ti.nomenclatureId) || 0;
          globalTransitMap.set(ti.nomenclatureId, prev + Number(ti.quantity));
        }

        const deficitList: any[] = [];
        for (const nom of noms) {
          const minStock = Number(nom.minStock);
          const relevantItems = (!isAdmin && userWarehouseIds.length > 0)
            ? nom.stockItems.filter((si) => userWarehouseIds.includes(si.warehouseId))
            : nom.stockItems;

          if (!isAdmin && userWarehouseIds.length > 0 && relevantItems.length === 0) {
            continue;
          }

          // Общий физический остаток номенклатуры по всем складам
          const totalStock = nom.stockItems.reduce((sum, si) => sum + Number(si.quantity), 0);
          // Количество в пути
          const inTransitQty = globalTransitMap.get(nom.id) || 0;
          // Эффективный остаток предприятия с учетом груза в пути
          const totalEffectiveStock = totalStock + inTransitQty;

          // Дефицит возникает ТОЛЬКО если (физический остаток + груз в пути) <= minStock
          if (minStock > 0 && totalEffectiveStock <= minStock) {
            const primaryItem = relevantItems[0] || nom.stockItems[0];
            deficitList.push({
              id: primaryItem?.id || nom.id,
              name: nom.name,
              warehouseName: nom.stockItems.length > 1 ? 'Все склады' : (primaryItem?.warehouse?.name || '—'),
              warehouseCode: nom.stockItems.length > 1 ? 'ВСЕ' : (primaryItem?.warehouse?.code || '—'),
              quantity: totalStock,
              inTransitQuantity: inTransitQty,
              effectiveQuantity: totalEffectiveStock,
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
        inTransitTransfersCount,
        recentOperations,
        userWarehouseIds,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка получения статистики WMS:', message);
    return NextResponse.json({ success: false, error: 'Ошибка получения статистики WMS', details: message }, { status: 500 });
  }
}
