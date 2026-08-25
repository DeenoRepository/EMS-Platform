import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

// PATCH /api/wms/stock/[id]/location - Assign or update storage cell of a stock item
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const stockItem = await prisma.stockItem.findUnique({
      where: { id: params.id },
      include: { warehouse: true },
    });

    if (!stockItem) {
      return NextResponse.json({ success: false, error: 'Позиция остатка не найдена' }, { status: 404 });
    }

    const canManage =
      user.roles.includes('admin') ||
      hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE) ||
      hasPermission(user, PERMISSIONS.WMS_ZONES_MANAGE) ||
      hasPermission(user, PERMISSIONS.WMS_NOMENCLATURE_MANAGE) ||
      Boolean(stockItem.warehouse.responsibleUserId && stockItem.warehouse.responsibleUserId === user.userId);

    if (!canManage) {
      return forbiddenResponse(`Недостаточно прав для изменения ячейки хранения ТМЦ на складе "${stockItem.warehouse.name}".`);
    }

    const body = await req.json();
    const { cellId } = body;

    // Verify cell if provided
    if (cellId) {
      const cell = await prisma.storageCell.findUnique({
        where: { id: cellId },
        include: { zone: true },
      });
      if (!cell) {
        return NextResponse.json(
          { success: false, error: 'Выбранная ячейка хранения не найдена' },
          { status: 404 }
        );
      }
      if (cell.zone.warehouseId !== stockItem.warehouseId) {
        return NextResponse.json(
          { success: false, error: 'Выбранная ячейка не принадлежит складу ТМЦ' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.stockItem.update({
      where: { id: params.id },
      data: {
        cellId: cellId || null,
      },
      include: {
        cell: {
          include: {
            zone: true,
          },
        },
        nomenclature: true,
        warehouse: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: cellId ? 'Место хранения закреплено' : 'Место хранения очищено',
    });
  } catch (error) {
    console.error('Error updating stock item location:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
