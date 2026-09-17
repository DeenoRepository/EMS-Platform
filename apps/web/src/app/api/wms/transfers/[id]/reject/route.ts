import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, StockTransferStatus, StockReservationStatus, OperationType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { canManageWarehouse } from '@/lib/wms-access';
import { assertNoActiveInventory } from '@/lib/wms-inventory-lock';

export const dynamic = 'force-dynamic';

// POST /api/wms/transfers/[id]/reject - Отклонение перемещения или запроса
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, PERMISSIONS.WMS_OPERATIONS_CREATE);
    if (auth.errorResponse) return auth.errorResponse;
    const { user } = auth;

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

    const transferStatus = transfer.status as StockTransferStatus;

    if (
      transferStatus !== StockTransferStatus.IN_TRANSIT &&
      transferStatus !== StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION &&
      transferStatus !== StockTransferStatus.REQUESTED
    ) {
      return NextResponse.json(
        { success: false, error: `Перемещение в статусе "${transfer.status}" не может быть отклонено` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const reason = body?.reason?.trim();

    if (!reason || reason.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Укажите причину / основание отклонения (не менее 3 символов)' },
        { status: 400 }
      );
    }

    const isAdmin =
      user.roles.includes('admin') ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    // Проверка прав:
    // Если статус IN_TRANSIT (в пути) -> отклонить может получатель (или админ)
    // Если статус REQUESTED (запрос) -> отклонить может отправитель (или админ)
    if (!isAdmin) {
      if (transferStatus === StockTransferStatus.IN_TRANSIT || transferStatus === StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION) {
        if (!canManageWarehouse(user, transfer.targetWarehouse.responsibleUserId)) {
          return forbiddenResponse(
            `Отклонить приемку может только ответственное лицо склада-получателя "${transfer.targetWarehouse.name}".`
          );
        }
      } else if (transferStatus === StockTransferStatus.REQUESTED) {
        if (!canManageWarehouse(user, transfer.sourceWarehouse.responsibleUserId)) {
          return forbiddenResponse(
            `Отклонить запрос на перевод может только ответственное лицо склада-отправителя "${transfer.sourceWarehouse.name}".`
          );
        }
      }
    }

    try {
      await assertNoActiveInventory([transfer.sourceWarehouseId, transfer.targetWarehouseId]);
    } catch (error) {
      if (error instanceof Error && error.message === 'WMS_INVENTORY_LOCKED') {
        return NextResponse.json({ success: false, error: 'На одном из складов проводится инвентаризация. Операция временно заблокирована.' }, { status: 409 });
      }
      throw error;
    }

    // Транзакционно выполняем возврат остатков (если было списано в IN_TRANSIT) и обновляем статус
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      await assertNoActiveInventory([transfer.sourceWarehouseId, transfer.targetWarehouseId], tx);

      const claimed = await tx.stockTransfer.updateMany({
        where: { id: transferId, status: transferStatus },
        data: { status: StockTransferStatus.REJECTED, rejectedAt: new Date(), rejectedById: user.userId, rejectionReason: reason },
      });
      if (claimed.count !== 1) {
        throw new Error('Перемещение уже обрабатывается или имеет другой статус');
      }

      // Если было IN_TRANSIT, возвращаем остатки на склад-отправитель
      if (transferStatus === StockTransferStatus.IN_TRANSIT || transferStatus === StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION) {
        for (const item of transfer.items) {
          const qtyToRestore = Number(item.quantity);
          const stock = await tx.stockItem.findUnique({
            where: {
              warehouseId_nomenclatureId: {
                warehouseId: transfer.sourceWarehouseId,
                nomenclatureId: item.nomenclatureId,
              },
            },
          });

          if (stock) {
            await tx.stockItem.update({
              where: { id: stock.id },
              data: {
                quantity: { increment: qtyToRestore },
                reservedQuantity: { decrement: qtyToRestore },
              },
            });
          } else {
            await tx.stockItem.create({
              data: {
                warehouseId: transfer.sourceWarehouseId,
                nomenclatureId: item.nomenclatureId,
                quantity: qtyToRestore,
              },
            });
          }
        }

        const released = await tx.stockReservation.updateMany({
          where: { transferId, status: StockReservationStatus.ACTIVE },
          data: { status: StockReservationStatus.RELEASED, releasedAt: new Date() },
        });
        if (released.count !== transfer.items.length) throw new Error('Резерв перемещения изменился параллельно');

        await tx.stockOperation.create({
          data: {
            warehouseId: transfer.sourceWarehouseId,
            type: OperationType.RECEIPT,
            date: new Date(),
            counterparty: `Возврат со склада: ${transfer.targetWarehouse.name} (${transfer.targetWarehouse.code})`,
            document: `Возврат по перемещению № ${transfer.transferNumber}`,
            comment: 'Возврат ТМЦ после отклонения приемки',
            createdById: user.userId,
            items: { create: transfer.items.map((item) => ({ nomenclatureId: item.nomenclatureId, quantity: item.quantity })) },
          },
        });
      }

      // Переводим перемещение в статус REJECTED
      return tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: StockTransferStatus.REJECTED,
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
        status: 'REJECTED',
        previousStatus: transferStatus,
        transferNumber: transfer.transferNumber,
        reason,
      },
    }).catch((error) => console.error('Не удалось записать аудит отклонения:', error));

    // Отправляем уведомление инициатору
    const isStockRestored = transferStatus === StockTransferStatus.IN_TRANSIT || transferStatus === StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION;
    const notifyUserId = isStockRestored
      ? (transfer.dispatchedById || transfer.sourceWarehouse.responsibleUserId)
      : (transfer.createdById || transfer.targetWarehouse.responsibleUserId);

    if (notifyUserId && notifyUserId !== user.userId) {
      await prisma.notification.create({
        data: {
          userId: notifyUserId,
          title: isStockRestored ? 'Приемка перемещения ТМЦ отклонена' : 'Запрос на перемещение ТМЦ отклонен',
          message: isStockRestored
            ? `Склад «${transfer.targetWarehouse.name}» отклонил приемку перемещения № ${transfer.transferNumber}. ТМЦ возвращены на ваш склад. Причина: ${reason}`
            : `Склад «${transfer.sourceWarehouse.name}» отклонил заявку на перевод № ${transfer.transferNumber}. Причина: ${reason}`,
          type: 'SYSTEM',
          link: isStockRestored
            ? '/wms/operations?tab=transfers&mode=outbound'
            : '/wms/operations?tab=transfers&mode=my_requests',
        },
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      data: updatedTransfer,
      message: isStockRestored
        ? `Приемка перемещения ${transfer.transferNumber} отклонена. ТМЦ возвращены на склад-отправитель "${transfer.sourceWarehouse.name}". Причина: ${reason}`
        : `Запрос на перемещение ${transfer.transferNumber} отклонен. Причина: ${reason}`,
    });
  } catch (error: any) {
    console.error('Ошибка отклонения перемещения:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка отклонения перемещения' },
      { status: 400 }
    );
  }
}
