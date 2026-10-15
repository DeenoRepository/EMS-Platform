import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

// GET /api/wms/cells/[id] - Получение информации о ячейке и находящихся в ней ТМЦ
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const cell = await prisma.storageCell.findUnique({
      where: { id: params.id },
      include: {
        zone: {
          include: {
            warehouse: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        stockItems: {
          where: {
            quantity: { gt: 0 },
          },
          include: {
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
          orderBy: {
            nomenclature: { name: 'asc' },
          },
        },
      },
    });

    if (!cell) {
      return NextResponse.json({ success: false, error: 'Ячейка хранения не найдена' }, { status: 404 });
    }

    const items = cell.stockItems.map((si) => ({
      stockItemId: si.id,
      nomenclatureId: si.nomenclatureId,
      name: si.nomenclature.name,
      article: si.nomenclature.article || '—',
      category: si.nomenclature.category?.name || 'Без категории',
      unit: si.nomenclature.unit,
      quantity: Number(si.quantity),
      minStock: si.nomenclature.minStock !== null ? Number(si.nomenclature.minStock) : null,
      compatibleEquipment: si.nomenclature.equipmentLinks.map((l) => l.equipment),
      updatedAt: si.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: cell.id,
        code: cell.code,
        name: cell.name || null,
        zone: {
          id: cell.zone.id,
          name: cell.zone.name,
          code: cell.zone.code,
        },
        warehouse: cell.zone.warehouse,
        totalItemsCount: items.length,
        totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
        items,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка получения данных ячейки склада:', message);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера', details: message },
      { status: 500 }
    );
  }
}
