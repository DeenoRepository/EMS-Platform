import { NextRequest, NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/safe-error';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, StockTransferStatus, OperationType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface CellAllocationInput {
  itemId: string;
  targetCellId?: string | null;
}

// POST /api/wms/transfers/[id]/receive - Подтверждение приемки ТМЦ на складе-получателе
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'wms-transfer-receive' });
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
        createdBy: { select: { id: true, displayName: true } },
        dispatchedBy: { select: { id: true, displayName: true } },
        items: { include: { nomenclature: true } },
      },
    });

    if (!transfer) {
      return NextResponse.json({ success: false, error: 'Перемещение не найдено' }, { status: 404 });
    }

    if (transfer.status !== StockTransferStatus.IN_TRANSIT) {
      return NextResponse.json(
        { success: false, error: `Перемещение находится в статусе "${transfer.status}" и не ожидает приемки` },
        { status: 400 }
      );
    }

    const isAdmin =
      user.roles.includes('admin') ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    if (!isAdmin && transfer.targetWarehouse.responsibleUserId && transfer.targetWarehouse.responsibleUserId !== user.userId) {
      return forbiddenResponse(
        `Вы не являетесь ответственным лицом за склад-получатель "${transfer.targetWarehouse.name}". Приемка запрещена.`
      );
    }

    let cellAllocations: CellAllocationInput[] = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.cellAllocations)) {
        cellAllocations = body.cellAllocations;
      }
    } catch {
      // тело может быть пустым
    }

    // Транзакционно зачисляем ТМЦ на склад-получатель и обновляем статус
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const qtyToReceive = Number(item.quantity);
        const cellAlloc = cellAllocations.find((c) => c.itemId === item.id);
        const targetCellId = cellAlloc?.targetCellId || item.targetCellId || null;

        // Если указана ячейка, обновляем ее в строке перемещения
        if (targetCellId) {
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { targetCellId },
          });
        }

        // Зачисляем остаток на склад-получатель
        const existingStock = await tx.stockItem.findUnique({
          where: {
            warehouseId_nomenclatureId: {
              warehouseId: transfer.targetWarehouseId,
              nomenclatureId: item.nomenclatureId,
            },
          },
        });

        if (existingStock) {
          await tx.stockItem.update({
            where: { id: existingStock.id },
            data: {
              quantity: Number(existingStock.quantity) + qtyToReceive,
              cellId: targetCellId || existingStock.cellId,
            },
          });
        } else {
          await tx.stockItem.create({
            data: {
              warehouseId: transfer.targetWarehouseId,
              nomenclatureId: item.nomenclatureId,
              quantity: qtyToReceive,
              cellId: targetCellId,
            },
          });
        }
      }

      // Создаем запись в журнале складских операций StockOperation (для аудита и отчетов)
      await tx.stockOperation.create({
        data: {
          warehouseId: transfer.targetWarehouseId,
          type: OperationType.TRANSFER,
          date: new Date(),
          counterparty: `Склад-отправитель: ${transfer.sourceWarehouse.name} (${transfer.sourceWarehouse.code})`,
          document: `Перемещение № ${transfer.transferNumber}`,
          comment: `Принято по межскладскому перемещению. Инициатор: ${transfer.createdBy?.displayName || 'Инициатор перемещения'}${transfer.requestReason ? `. Основание: ${transfer.requestReason}` : ''}`,
          createdById: user.userId,
          items: {
            create: transfer.items.map((it) => ({
              nomenclatureId: it.nomenclatureId,
              quantity: it.quantity,
            })),
          },
        },
      });

      // Переводим перемещение в статус COMPLETED
      return tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: StockTransferStatus.COMPLETED,
          receivedAt: new Date(),
          receivedById: user.userId,
        },
        include: {
          sourceWarehouse: true,
          targetWarehouse: true,
          items: { include: { nomenclature: true, targetCell: true } },
        },
      });
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'StockTransfer',
      entityId: transfer.id,
      changes: {
        status: 'COMPLETED',
        action: 'RECEIPT_CONFIRMED',
        transferNumber: transfer.transferNumber,
      },
    });

    // Отправляем уведомление МОЛ склада-отправителя
    const senderUserId = transfer.sourceWarehouse.responsibleUserId || transfer.dispatchedById;
    if (senderUserId && senderUserId !== user.userId) {
      await prisma.notification.create({
        data: {
          userId: senderUserId,
          title: 'Перемещение ТМЦ успешно принято',
          message: `Склад «${transfer.targetWarehouse.name}» подтвердил приемку ТМЦ по перемещению № ${transfer.transferNumber}.`,
          type: 'SYSTEM',
          link: '/wms/transfers?mode=outbound',
        },
      }).catch((error: unknown) => {
        logger.warn('Не удалось отправить уведомление о приемке перемещения', {
          transferId: transfer.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedTransfer,
      message: `Приемка перемещения ${transfer.transferNumber} успешно подтверждена. ТМЦ зачислены на склад "${transfer.targetWarehouse.name}".`,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка подтверждения приемки', 500, { endpoint: 'wms-transfer-receive' });
  }
}
