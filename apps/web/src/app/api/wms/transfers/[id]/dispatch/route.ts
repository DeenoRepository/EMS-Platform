import { NextRequest, NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/safe-error';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, StockTransferStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST /api/wms/transfers/[id]/dispatch - Согласование и отгрузка запроса на перемещение
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'wms-transfer-dispatch' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_OPERATIONS_CREATE)) return forbiddenResponse();

    const transferId = (await params).id;
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

    // Транзакционно проверяем и списываем ТМЦ со склада-отправителя
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const qtyToTransfer = Number(item.quantity);
        const stock = await tx.stockItem.findUnique({
          where: {
            warehouseId_nomenclatureId: {
              warehouseId: transfer.sourceWarehouseId,
              nomenclatureId: item.nomenclatureId,
            },
          },
          include: { nomenclature: { select: { name: true, unit: true } } },
        });

        const availableQty = stock ? Number(stock.quantity) : 0;
        if (availableQty < qtyToTransfer) {
          const nomName = item.nomenclature?.name || stock?.nomenclature?.name || 'ТМЦ';
          const nomUnit = item.nomenclature?.unit || stock?.nomenclature?.unit || 'шт';
          throw new Error(
            `Недостаточно остатка на складе "${transfer.sourceWarehouse.name}" для позиции "${nomName}". Доступно: ${availableQty} ${nomUnit}, требуется: ${qtyToTransfer} ${nomUnit}`
          );
        }

        // Списываем со склада-отправителя
        const updated = await tx.stockItem.update({
          where: { id: stock!.id },
          data: { quantity: availableQty - qtyToTransfer },
        });

        if (Number(updated.quantity) < 0) {
          throw new Error(
            `Остаток для "${item.nomenclature?.name || 'ТМЦ'}" на складе "${transfer.sourceWarehouse.name}" не может быть отрицательным.`
          );
        }
      }

      // Переводим статус в IN_TRANSIT
      return tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: StockTransferStatus.IN_TRANSIT,
          dispatchedAt: new Date(),
          dispatchedById: user.userId,
        },
        include: {
          sourceWarehouse: true,
          targetWarehouse: true,
          items: { include: { nomenclature: true } },
        },
      });
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
      }).catch((error: unknown) => {
        logger.warn('Не удалось отправить уведомление об отгрузке согласованного перемещения', {
          transferId: transfer.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedTransfer,
      message: `Запрос ${transfer.transferNumber} согласован и отгружен. ТМЦ в пути на склад "${transfer.targetWarehouse.name}".`,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка отгрузки перемещения', 500, { endpoint: 'wms-transfer-dispatch' });
  }
}
