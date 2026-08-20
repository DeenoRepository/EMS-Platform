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
      prisma.inventory.count({ where: { status: 'IN_PROGRESS' } }),
      // Оптимизированный запрос дефицитных позиций без выгрузки всей таблицы
      prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          warehouseName: string;
          warehouseCode: string;
          quantity: number;
          minStock: number;
          unit: string;
        }>
      >`
        SELECT 
          si.id,
          n.name,
          w.name as "warehouseName",
          w.code as "warehouseCode",
          si.quantity::float as quantity,
          n."minStock"::float as "minStock",
          n.unit
        FROM "StockItem" si
        JOIN "Nomenclature" n ON si."nomenclatureId" = n.id
        JOIN "Warehouse" w ON si."warehouseId" = w.id
        WHERE n."minStock" IS NOT NULL AND si.quantity <= n."minStock"
        ORDER BY (si.quantity / NULLIF(n."minStock", 0)) ASC, n.name ASC
      `.catch(async () => {
        // Fallback через Prisma query с фильтром по номенклатурам с minStock != null
        const items = await prisma.stockItem.findMany({
          where: {
            nomenclature: { minStock: { not: null } },
          },
          include: {
            nomenclature: { select: { minStock: true, name: true, unit: true } },
            warehouse: { select: { name: true, code: true } },
          },
        });
        return items
          .filter((si) => si.nomenclature.minStock !== null && Number(si.quantity) <= Number(si.nomenclature.minStock))
          .map((si) => ({
            id: si.id,
            name: si.nomenclature.name,
            warehouseName: si.warehouse.name,
            warehouseCode: si.warehouse.code,
            quantity: Number(si.quantity),
            minStock: Number(si.nomenclature.minStock),
            unit: si.nomenclature.unit,
          }));
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
      },
    });
  } catch (error: any) {
    console.error('Ошибка получения статистики WMS:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения статистики WMS' }, { status: 500 });
  }
}
