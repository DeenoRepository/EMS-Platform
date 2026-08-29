import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// PATCH /api/wms/stock/[id]/location - Assign or update storage cell of a stock item
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'wms-stock-location' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const stockItem = await prisma.stockItem.findUnique({
      where: { id: (await params).id },
      include: { warehouse: true },
    });

    if (!stockItem) {
      return NextResponse.json({ success: false, error: 'Позиция остатка не найдена' }, { status: 404 });
    }

    const isAdmin =
      isAdminUser(user) ||
      hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    const isResponsible = Boolean(
      stockItem.warehouse.responsibleUserId && stockItem.warehouse.responsibleUserId === user.userId
    );

    const hasZonePermission =
      hasPermission(user, PERMISSIONS.WMS_ZONES_MANAGE) ||
      hasPermission(user, PERMISSIONS.WMS_NOMENCLATURE_MANAGE);

    const canManage = isAdmin || (isResponsible && hasZonePermission);

    if (!canManage) {
      return forbiddenResponse(
        `Вы не являетесь ответственным лицом за склад "${stockItem.warehouse.name}". Назначение и изменение ячеек чужого склада запрещено.`
      );
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
      where: { id: (await params).id },
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
    logger.error('Failed to update stock item location', {
      endpoint: 'wms-stock-location-patch',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
