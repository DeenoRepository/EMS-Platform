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
    const categoryId = searchParams.get('categoryId')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)));

    const where: any = {};

    if (warehouseId) {
      where.warehouseId = warehouseId;
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
        ],
      };
    }

    // Получаем список остатков
    const [total, stockItems] = await Promise.all([
      prisma.stockItem.count({ where }),
      prisma.stockItem.findMany({
        where,
        include: {
          warehouse: true,
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

    const formatted = stockItems.map((item) => {
      const qty = Number(item.quantity);
      const minStock = item.nomenclature.minStock !== null ? Number(item.nomenclature.minStock) : null;
      const isLowStock = minStock !== null && qty <= minStock;

      return {
        id: item.id,
        warehouseId: item.warehouseId,
        warehouseName: item.warehouse.name,
        warehouseCode: item.warehouse.code,
        nomenclatureId: item.nomenclatureId,
        name: item.nomenclature.name,
        article: item.nomenclature.article || '—',
        unit: item.nomenclature.unit,
        category: item.nomenclature.category?.name || 'Без категории',
        quantity: qty,
        minStock: minStock !== null ? minStock : '—',
        isLowStock,
        compatibleEquipmentCount: item.nomenclature.equipmentLinks.length,
        compatibleEquipment: item.nomenclature.equipmentLinks.map((l) => l.equipment),
        updatedAt: item.updatedAt,
      };
    });

    const finalItems = lowStockOnly ? formatted.filter((item) => item.isLowStock) : formatted;

    return NextResponse.json({
      success: true,
      data: {
        items: finalItems,
        total: lowStockOnly ? finalItems.length : total,
        page,
        pageSize,
        totalPages: Math.ceil((lowStockOnly ? finalItems.length : total) / pageSize),
      },
    });
  } catch (error: any) {
    console.error('Ошибка получения остатков склада:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения остатков склада' }, { status: 500 });
  }
}
