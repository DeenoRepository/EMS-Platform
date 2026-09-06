import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, StockTransferStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { WarehouseService } from '@ems/wms';

export const dynamic = 'force-dynamic';

// POST /api/wms/transfers/[id]/dispatch - Согласование и отгрузка запроса на перемещение
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_OPERATIONS_CREATE)) return forbiddenResponse();

    const transferId = params.id;
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        sourceWarehouse: true,
        targetWarehouse: true,
        items: { include: { nomenclature: true } },
      },
    });

    if (!transfer) {
      return NextResponse.json({ success: false, error: 'Перемещение не найдено' }, { status: 404 });
    }

    if (transfer.status !== StockTransferStatus.REQUESTED) {
      return NextResponse.json(
        { success: false, error: `Перемещение находится в статусе "${transfer.status}" и не может быть отгружено` },
        { status: 400 }
      );
    }

    const isAdmin =
      user.roles.includes('admin') ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    if (!isAdmin && transfer.sourceWarehouse.responsibleUserId && transfer.sourceWarehouse.responsibleUserId !== user.userId) {
      return forbiddenResponse(
        `Вы не являетесь ответственным лицом за склад-отправитель "${transfer.sourceWarehouse.name}". Отгрузка запрещена.`
      );
    }

    // Транзакционно проверяем и списываем ТМЦ со склада-отправителя через сервис WMS
    const updatedTransfer = await WarehouseService.dispatchStockTransfer({
      transferId,
      userId: user.userId,
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'StockTransfer',
      entityId: transfer.id,
      changes: {
        status: 'IN_TRANSIT',
        action: 'DISPATCH_APPROVED',
        transferNumber: transfer.transferNumber,
      },
    });

    // Отправляем уведомление МОЛ склада-получателя (или создателю запроса)
    const recipientUserId = transfer.targetWarehouse.responsibleUserId || transfer.createdById;
    if (recipientUserId && recipientUserId !== user.userId) {
      await prisma.notification.create({
        data: {
          userId: recipientUserId,
          title: 'Запрос на перемещение согласован и отгружен',
          message: `Склад «${transfer.sourceWarehouse.name}» согласовал и отгрузил ТМЦ по заявке № ${transfer.transferNumber}. Ожидается приемка.`,
          type: 'SYSTEM',
          link: '/wms/transfers?mode=inbound',
        },
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      data: updatedTransfer,
      message: `Запрос ${transfer.transferNumber} согласован и отгружен. ТМЦ в пути на склад "${transfer.targetWarehouse.name}".`,
    });
  } catch (error: any) {
    console.error('Ошибка отгрузки перемещения:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка отгрузки перемещения' },
      { status: 400 }
    );
  }
}
