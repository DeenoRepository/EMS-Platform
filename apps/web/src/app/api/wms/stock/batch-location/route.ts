import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// PATCH /api/wms/stock/batch-location - Assign or clear storage cell for multiple stock items
export async function PATCH(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'wms-stock-batch-location' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { stockItemIds, cellId } = body;

    if (!Array.isArray(stockItemIds) || stockItemIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Укажите хотя бы одну позицию ТМЦ для назначения ячейки' },
        { status: 400 }
      );
    }

    const stockItems = await prisma.stockItem.findMany({
      where: { id: { in: stockItemIds } },
      include: {
        warehouse: true,
        nomenclature: true,
        cell: { include: { zone: true } },
      },
    });

    if (stockItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Выбранные позиции ТМЦ не найдены' },
        { status: 404 }
      );
    }

    const isAdmin =
      user.roles.includes('admin') ||
      hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    const hasZonePermission =
      hasPermission(user, PERMISSIONS.WMS_ZONES_MANAGE) ||
      hasPermission(user, PERMISSIONS.WMS_NOMENCLATURE_MANAGE);

    // Validate warehouse access for all stock items
    for (const item of stockItems) {
      const isResponsible = Boolean(
        item.warehouse.responsibleUserId && item.warehouse.responsibleUserId === user.userId
      );
      const canManage = isAdmin || (isResponsible && hasZonePermission);
      if (!canManage) {
        return forbiddenResponse(
          `Вы не являетесь ответственным лицом за склад "${item.warehouse.name}". Назначение ячеек чужого склада запрещено.`
        );
      }
    }

    // Verify cell if provided
    let targetCell: any = null;
    if (cellId) {
      targetCell = await prisma.storageCell.findUnique({
        where: { id: cellId },
        include: { zone: true },
      });
      if (!targetCell) {
        return NextResponse.json(
          { success: false, error: 'Выбранная ячейка хранения не найдена' },
          { status: 404 }
        );
      }

      // Check if all stockItems belong to targetCell.zone.warehouseId
      const targetWarehouseId = targetCell.zone.warehouseId;
      const invalidItem = stockItems.find((i) => i.warehouseId !== targetWarehouseId);
      if (invalidItem) {
        return NextResponse.json(
          {
            success: false,
            error: `Позиция «${invalidItem.nomenclature.name}» находится на складе "${invalidItem.warehouse.name}", а выбранная ячейка принадлежит другому складу`,
          },
          { status: 400 }
        );
      }
    }

    // Atomic update in transaction
    await prisma.$transaction(async (tx) => {
      await tx.stockItem.updateMany({
        where: { id: { in: stockItemIds } },
        data: {
          cellId: cellId || null,
        },
      });

      await logAuditEvent({
        userId: user.userId,
        action: 'UPDATE',
        entityType: 'StockItem',
        entityId: stockItemIds.join(','),
        changes: {
          action: cellId ? 'WMS_STOCK_BATCH_CELL_ASSIGN' : 'WMS_STOCK_BATCH_CELL_CLEAR',
          count: stockItemIds.length,
          cellId: cellId || null,
          cellCode: targetCell ? `${targetCell.code} (${targetCell.zone.name})` : null,
          nomenclatureIds: stockItems.map((s) => s.nomenclatureId),
        },
      });
    });

    return NextResponse.json({
      success: true,
      count: stockItemIds.length,
      message: cellId
        ? `Успешно перемещено в ячейку ${targetCell?.code}: ${stockItemIds.length} позиций`
        : `Очищена привязка к ячейкам для ${stockItemIds.length} позиций`,
    });
  } catch (error) {
    console.error('Error in batch location update:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера при пакетном перемещении' },
      { status: 500 }
    );
  }
}
