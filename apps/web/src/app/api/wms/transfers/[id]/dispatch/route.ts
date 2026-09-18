import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, StockTransferStatus, StockReservationStatus, OperationType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { canManageWarehouse } from '@/lib/wms-access';
import { assertNoActiveInventory } from '@/lib/wms-inventory-lock';

export const dynamic = 'force-dynamic';

// POST /api/wms/transfers/[id]/dispatch - Согласование и отгрузка запроса на перемещение
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

    if (!canManageWarehouse(user, transfer.sourceWarehouse.responsibleUserId)) {
      return forbiddenResponse(
        `Вы не являетесь ответственным лицом за склад-отправитель "${transfer.sourceWarehouse.name}". Отгрузка запрещена.`
      );
    }
    try {
      await assertNoActiveInventory([transfer.sourceWarehouseId, transfer.targetWarehouseId]);
    } catch (error) {
      if (error instanceof Error && error.message === 'WMS_INVENTORY_LOCKED') {
        return NextResponse.json({ success: false, error: 'На одном из складов проводится инвентаризация. Отгрузка временно заблокирована.' }, { status: 409 });
      }
      throw error;
    }

    // Транзакционно проверяем и списываем ТМЦ со склада-отправителя
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      await assertNoActiveInventory([transfer.sourceWarehouseId, transfer.targetWarehouseId], tx);

      const nextStatus = transfer.targetWarehouse.responsibleUserId
        ? StockTransferStatus.IN_TRANSIT
        : StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION;
      const claimed = await tx.stockTransfer.updateMany({
        where: { id: transferId, status: StockTransferStatus.REQUESTED },
        data: { status: nextStatus, dispatchedAt: new Date(), dispatchedById: user.userId },
      });
      if (claimed.count !== 1) {
        throw new Error('Перемещение уже обрабатывается или имеет другой статус');
      }

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
        const changed = await tx.stockItem.updateMany({
          where: { id: stock!.id, quantity: { gte: qtyToTransfer } },
          data: {
            quantity: { decrement: qtyToTransfer },
            reservedQuantity: { increment: qtyToTransfer },
          },
        });
        if (changed.count !== 1) {
          throw new Error(`Остаток для "${item.nomenclature?.name || 'ТМЦ'}" изменился параллельно.`);
        }

        if (item.sourceCellId) {
          const cellChanged = await tx.stockCellBalance.updateMany({
            where: {
              warehouseId: transfer.sourceWarehouseId,
              cellId: item.sourceCellId,
              nomenclatureId: item.nomenclatureId,
              quantity: { gte: qtyToTransfer },
            },
            data: { quantity: { decrement: qtyToTransfer } },
          });
          if (cellChanged.count !== 1) throw new Error('Недостаточно остатка в исходной ячейке');
        }
      }

      await tx.stockReservation.createMany({
        data: transfer.items.map((item) => ({
          transferId,
          sourceWarehouseId: transfer.sourceWarehouseId,
          targetWarehouseId: transfer.targetWarehouseId,
          nomenclatureId: item.nomenclatureId,
          quantity: item.quantity,
          status: StockReservationStatus.ACTIVE,
          requiresResponsibleConfirmation: !transfer.targetWarehouse.responsibleUserId,
        })),
        skipDuplicates: true,
      });

      await tx.stockOperation.create({
        data: {
          warehouseId: transfer.sourceWarehouseId,
          type: OperationType.ISSUE,
          date: new Date(),
          counterparty: `Склад-получатель: ${transfer.targetWarehouse.name} (${transfer.targetWarehouse.code})`,
          document: `Перемещение № ${transfer.transferNumber}`,
          comment: 'Списание при отгрузке межскладского перемещения',
          createdById: user.userId,
          items: { create: transfer.items.map((item) => ({ nomenclatureId: item.nomenclatureId, quantity: item.quantity })) },
        },
      });

      // Переводим статус в IN_TRANSIT
      return tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: nextStatus,
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
    }).catch((error) => console.error('Не удалось записать аудит отгрузки:', error));

    // Отправляем уведомление МОЛ склада-получателя (или создателю запроса)
    const recipientUserId = transfer.targetWarehouse.responsibleUserId || transfer.createdById;
    if (recipientUserId && recipientUserId !== user.userId) {
      await prisma.notification.create({
        data: {
          userId: recipientUserId,
          title: 'Запрос на перемещение согласован и отгружен',
          message: `Склад «${transfer.sourceWarehouse.name}» согласовал и отгрузил ТМЦ по заявке № ${transfer.transferNumber}. Ожидается приемка.`,
          type: 'SYSTEM',
          link: '/wms/operations?tab=transfers&mode=inbound',
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
