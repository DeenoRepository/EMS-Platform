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

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId')?.trim() || '';
    const zoneId = searchParams.get('zoneId')?.trim() || '';
    const categoryId = searchParams.get('categoryId')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '25', 10)));

    const where: any = {};

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (zoneId) {
      where.cell = {
        zoneId,
      };
    }

    if (categoryId) {
      where.nomenclature = {
        ...where.nomenclature,
        categoryId,
      };
    }

    if (search) {
      where.nomenclature = {
        ...where.nomenclature,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { article: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    let total = 0;
    let finalItems: any[] = [];
    let lowStockTotalCount = 0;

    // 1. Поиск номенклатур с установленным неснижаемым порогом (minStock > 0)
    const nomenclatureWhere: any = {
      minStock: { gt: 0 },
      deletedAt: null,
    };
    if (categoryId) {
      nomenclatureWhere.categoryId = categoryId;
    }
    if (search) {
      nomenclatureWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { article: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const deficitNomenclatures = await prisma.nomenclature.findMany({
      where: nomenclatureWhere,
      include: {
        category: true,
        stockItems: {
          include: {
            warehouse: true,
            cell: {
              include: { zone: true },
            },
          },
        },
        equipmentLinks: {
          include: {
            equipment: {
              select: { id: true, name: true, inventoryNumber: true, status: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Формируем плоский список дефицитных позиций
    const deficitRows: any[] = [];

    for (const nom of deficitNomenclatures) {
      const minStock = Number(nom.minStock);
      const totalStock = nom.stockItems.reduce((sum, si) => sum + Number(si.quantity), 0);

      if (warehouseId) {
        // Контекст конкретного склада
        const whStockItem = nom.stockItems.find((si) => si.warehouseId === warehouseId);
        const whQty = whStockItem ? Number(whStockItem.quantity) : 0;
        const isDeficitOnWarehouse = whQty <= minStock || totalStock <= minStock;

        if (isDeficitOnWarehouse) {
          if (whStockItem) {
            deficitRows.push({
              id: whStockItem.id,
              warehouseId: whStockItem.warehouseId,
              warehouseName: whStockItem.warehouse.name,
              warehouseCode: whStockItem.warehouse.code,
              warehouseResponsibleUserId: whStockItem.warehouse.responsibleUserId || null,
              nomenclatureId: nom.id,
              name: nom.name,
              article: nom.article || '—',
              description: nom.description || null,
              unit: nom.unit,
              category: nom.category?.name || 'Без категории',
              quantity: whQty,
              totalStock,
              minStock,
              isLowStock: true,
              cellId: whStockItem.cellId,
              cellCode: whStockItem.cell?.code || null,
              cellName: whStockItem.cell?.name || null,
              zoneId: whStockItem.cell?.zone?.id || null,
              zoneName: whStockItem.cell?.zone?.name || null,
              zoneCode: whStockItem.cell?.zone?.code || null,
              compatibleEquipmentCount: nom.equipmentLinks.length,
              compatibleEquipment: nom.equipmentLinks.map((l) => l.equipment),
              updatedAt: whStockItem.updatedAt,
            });
          } else {
            // Позиция на складе полностью отсутствует (остаток 0)
            const targetWarehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
            deficitRows.push({
              id: `virtual_${nom.id}_${warehouseId}`,
              warehouseId,
              warehouseName: targetWarehouse?.name || 'Выбранный склад',
              warehouseCode: targetWarehouse?.code || '—',
              warehouseResponsibleUserId: targetWarehouse?.responsibleUserId || null,
              nomenclatureId: nom.id,
              name: nom.name,
              article: nom.article || '—',
              description: nom.description || null,
              unit: nom.unit,
              category: nom.category?.name || 'Без категории',
              quantity: 0,
              totalStock,
              minStock,
              isLowStock: true,
              cellId: null,
              cellCode: null,
              cellName: null,
              zoneId: null,
              zoneName: null,
              zoneCode: null,
              compatibleEquipmentCount: nom.equipmentLinks.length,
              compatibleEquipment: nom.equipmentLinks.map((l) => l.equipment),
              updatedAt: nom.updatedAt,
            });
          }
        }
      } else {
        // Контекст всей компании / всех складов
        if (totalStock <= minStock) {
          if (nom.stockItems.length > 0) {
            for (const si of nom.stockItems) {
              deficitRows.push({
                id: si.id,
                warehouseId: si.warehouseId,
                warehouseName: si.warehouse.name,
                warehouseCode: si.warehouse.code,
                warehouseResponsibleUserId: si.warehouse.responsibleUserId || null,
                nomenclatureId: nom.id,
                name: nom.name,
                article: nom.article || '—',
                description: nom.description || null,
                unit: nom.unit,
                category: nom.category?.name || 'Без категории',
                quantity: Number(si.quantity),
                totalStock,
                minStock,
                isLowStock: true,
                cellId: si.cellId,
                cellCode: si.cell?.code || null,
                cellName: si.cell?.name || null,
                zoneId: si.cell?.zone?.id || null,
                zoneName: si.cell?.zone?.name || null,
                zoneCode: si.cell?.zone?.code || null,
                compatibleEquipmentCount: nom.equipmentLinks.length,
                compatibleEquipment: nom.equipmentLinks.map((l) => l.equipment),
                updatedAt: si.updatedAt,
              });
            }
          } else {
            // Позиция вообще отсутствует на всех складах (нулевой приход)
            deficitRows.push({
              id: `virtual_${nom.id}`,
              warehouseId: 'unassigned',
              warehouseName: 'Все склады (не распределено)',
              warehouseCode: 'Н/Д',
              warehouseResponsibleUserId: null,
              nomenclatureId: nom.id,
              name: nom.name,
              article: nom.article || '—',
              description: nom.description || null,
              unit: nom.unit,
              category: nom.category?.name || 'Без категории',
              quantity: 0,
              totalStock: 0,
              minStock,
              isLowStock: true,
              cellId: null,
              cellCode: null,
              cellName: null,
              zoneId: null,
              zoneName: null,
              zoneCode: null,
              compatibleEquipmentCount: nom.equipmentLinks.length,
              compatibleEquipment: nom.equipmentLinks.map((l) => l.equipment),
              updatedAt: nom.updatedAt,
            });
          }
        }
      }
    }

    lowStockTotalCount = deficitRows.length;

    if (lowStockOnly) {
      total = lowStockTotalCount;
      finalItems = deficitRows.slice((page - 1) * pageSize, page * pageSize);
    } else {
      // Стандартный путь с пагинацией на уровне БД
      const [dbTotal, stockItems] = await Promise.all([
        prisma.stockItem.count({ where }),
        prisma.stockItem.findMany({
          where,
          include: {
            warehouse: true,
            cell: {
              include: {
                zone: true,
              },
            },
            nomenclature: {
              include: {
                category: true,
                stockItems: {
                  select: { quantity: true },
                },
                equipmentLinks: {
                  include: {
                    equipment: {
                      select: { id: true, name: true, inventoryNumber: true, status: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: [
            { warehouse: { name: 'asc' } },
            { nomenclature: { name: 'asc' } },
          ],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      total = dbTotal;
      finalItems = stockItems.map((item) => {
        const qty = Number(item.quantity);
        const minStock = item.nomenclature.minStock !== null ? Number(item.nomenclature.minStock) : null;
        // Дефицит считается суммарно по номенклатуре со всех складов только при minStock > 0
        const totalStock = item.nomenclature.stockItems
          ? item.nomenclature.stockItems.reduce((sum: number, s: any) => sum + Number(s.quantity), 0)
          : qty;
        const isLowStock = minStock !== null && minStock > 0 && totalStock <= minStock;

        return {
          id: item.id,
          warehouseId: item.warehouseId,
          warehouseName: item.warehouse.name,
          warehouseCode: item.warehouse.code,
          warehouseResponsibleUserId: item.warehouse.responsibleUserId || null,
          nomenclatureId: item.nomenclatureId,
          name: item.nomenclature.name,
          article: item.nomenclature.article || '—',
          description: item.nomenclature.description || null,
          unit: item.nomenclature.unit,
          category: item.nomenclature.category?.name || 'Без категории',
          quantity: qty,
          totalStock,
          minStock: minStock !== null ? minStock : '—',
          isLowStock,
          cellId: item.cellId,
          cellCode: item.cell?.code || null,
          cellName: item.cell?.name || null,
          zoneId: item.cell?.zone?.id || null,
          zoneName: item.cell?.zone?.name || null,
          zoneCode: item.cell?.zone?.code || null,
          compatibleEquipmentCount: item.nomenclature.equipmentLinks.length,
          compatibleEquipment: item.nomenclature.equipmentLinks.map((l) => l.equipment),
          updatedAt: item.updatedAt,
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        items: finalItems,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        lowStockTotalCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка получения остатков склада:', message);
    return NextResponse.json({ success: false, error: 'Ошибка получения остатков склада', details: message }, { status: 500 });
  }
}
