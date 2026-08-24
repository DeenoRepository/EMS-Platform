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
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)));

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

    if (lowStockOnly) {
      // При фильтрации по дефициту выбираем номенклатуры с установленным minStock
      const queryWhere = {
        ...where,
        nomenclature: {
          ...where.nomenclature,
          minStock: { not: null },
        },
      };

      const allMatching = await prisma.stockItem.findMany({
        where: queryWhere,
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
      });

      const formatted = allMatching
        .map((item) => {
          const qty = Number(item.quantity);
          const minStock = item.nomenclature.minStock !== null ? Number(item.nomenclature.minStock) : null;
          const isLowStock = minStock !== null && qty <= minStock;

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
        })
        .filter((item) => item.isLowStock);

      total = formatted.length;
      finalItems = formatted.slice((page - 1) * pageSize, page * pageSize);
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
        const isLowStock = minStock !== null && qty <= minStock;

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
      },
    });
  } catch (error: any) {
    console.error('Ошибка получения остатков склада:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения остатков склада' }, { status: 500 });
  }
}
