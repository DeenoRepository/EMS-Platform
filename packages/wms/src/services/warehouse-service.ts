import { prisma, OperationType, StockTransferStatus, InventoryStatus } from '@ems/database';
import { calculateStockIssue, validatePositiveQuantity, isDeductingOperation } from '../domain/stock-engine';
import { dispatchTransfer, receiveTransfer, rejectTransfer } from '../domain/transfer-engine';
import { reconcileInventoryCounts } from '../domain/inventory-engine';
import { CreateStockOperationDto, StockTransferDispatchDto, StockTransferReceiveDto, StockTransferRejectDto, InventoryCompleteDto } from '../types';

export class WarehouseService {
  /**
   * Executes a stock operation (receipt, issue, transfer issue, write-off)
   * within an atomic database transaction.
   */
  static async executeOperation(dto: CreateStockOperationDto) {
    const { warehouseId, targetWarehouseId, type, counterparty, recipientName, equipmentId, document, comment, items, userId } = dto;

    if (!warehouseId) throw new Error('Укажите склад операции');
    if (!type || !(type in OperationType)) throw new Error('Укажите корректный тип операции');
    if (!Array.isArray(items) || items.length === 0) throw new Error('Добавьте хотя бы одну позицию ТМЦ');

    const isIssue = isDeductingOperation(type);

    let targetWarehouseName = '';
    if (type === OperationType.TRANSFER) {
      if (!targetWarehouseId) throw new Error('Для перемещения необходимо указать склад-получатель');
      if (warehouseId === targetWarehouseId) throw new Error('Склад-отправитель и склад-получатель не могут совпадать');

      const targetWarehouse = await prisma.warehouse.findUnique({
        where: { id: targetWarehouseId },
        select: { id: true, name: true, isActive: true },
      });
      if (!targetWarehouse || !targetWarehouse.isActive) {
        throw new Error('Склад-получатель не найден или неактивен');
      }
      targetWarehouseName = targetWarehouse.name;
    }

    const finalCounterparty =
      counterparty?.trim() ||
      (type === OperationType.ISSUE_EMPLOYEE && recipientName?.trim() ? `Сотрудник: ${recipientName.trim()}` : null);

    return await prisma.$transaction(async (tx: any) => {
      // 1. Validate stocks and deduct preconditions
      if (isIssue) {
        for (const item of items) {
          const validQty = validatePositiveQuantity(item.quantity);
          const stock = await tx.stockItem.findUnique({
            where: {
              warehouseId_nomenclatureId: {
                warehouseId,
                nomenclatureId: item.nomenclatureId,
              },
            },
            include: { nomenclature: true },
          });

          const currentQty = stock ? Number(stock.quantity) : 0;
          calculateStockIssue(currentQty, validQty);
        }
      }

      // 2. Create StockOperation record
      const op = await tx.stockOperation.create({
        data: {
          warehouseId,
          type,
          counterparty: finalCounterparty,
          document: document?.trim() || null,
          comment: comment?.trim() || (type === OperationType.TRANSFER ? `Перемещение на склад "${targetWarehouseName}"` : null),
          createdById: userId,
          items: {
            create: items.map((i) => ({
              nomenclatureId: i.nomenclatureId,
              quantity: validatePositiveQuantity(i.quantity),
              equipmentId: i.equipmentId || (type === OperationType.ISSUE_WRITE_OFF && equipmentId ? equipmentId : null),
            })),
          },
        },
        include: {
          items: {
            include: { nomenclature: true },
          },
        },
      });

      // 3. Update stock quantities atomically
      for (const item of items) {
        const qtyNum = validatePositiveQuantity(item.quantity);

        if (type === OperationType.RECEIPT) {
          await tx.stockItem.upsert({
            where: {
              warehouseId_nomenclatureId: {
                warehouseId,
                nomenclatureId: item.nomenclatureId,
              },
            },
            update: {
              quantity: { increment: qtyNum },
              ...(item.cellId ? { cellId: item.cellId } : {}),
            },
            create: {
              warehouseId,
              nomenclatureId: item.nomenclatureId,
              quantity: qtyNum,
              cellId: item.cellId || null,
            },
          });

          // Association of spare part with equipment in WMS
          if (item.equipmentId) {
            await tx.equipmentSparePart.upsert({
              where: {
                equipmentId_nomenclatureId: {
                  equipmentId: item.equipmentId,
                  nomenclatureId: item.nomenclatureId,
                },
              },
              update: {},
              create: {
                equipmentId: item.equipmentId,
                nomenclatureId: item.nomenclatureId,
              },
            });
          }
        } else if (type === OperationType.TRANSFER && targetWarehouseId) {
          const updatedStock = await tx.stockItem.update({
            where: {
              warehouseId_nomenclatureId: {
                warehouseId,
                nomenclatureId: item.nomenclatureId,
              },
            },
            data: {
              quantity: { decrement: qtyNum },
            },
            include: { nomenclature: true },
          });

          if (Number(updatedStock.quantity) < 0) {
            throw new Error(`Недостаточно остатка для "${updatedStock.nomenclature.name}". Исчерпан.`);
          }

          await tx.stockItem.upsert({
            where: {
              warehouseId_nomenclatureId: {
                warehouseId: targetWarehouseId,
                nomenclatureId: item.nomenclatureId,
              },
            },
            update: {
              quantity: { increment: qtyNum },
            },
            create: {
              warehouseId: targetWarehouseId,
              nomenclatureId: item.nomenclatureId,
              quantity: qtyNum,
            },
          });
        } else if (isIssue) {
          const updatedStock = await tx.stockItem.update({
            where: {
              warehouseId_nomenclatureId: {
                warehouseId,
                nomenclatureId: item.nomenclatureId,
              },
            },
            data: {
              quantity: { decrement: qtyNum },
            },
            include: { nomenclature: true },
          });

          if (Number(updatedStock.quantity) < 0) {
            throw new Error(`Недостаточно остатка для "${updatedStock.nomenclature.name}". Исчерпан.`);
          }
        }
      }

      return op;
    });
  }

  /**
   * Dispatches a transfer (changes status to IN_TRANSIT, decrements source warehouse stock)
   */
  static async dispatchStockTransfer(dto: StockTransferDispatchDto) {
    const { transferId, userId } = dto;
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });

    if (!transfer) throw new Error('Перемещение не найдено');
    if (transfer.status !== StockTransferStatus.REQUESTED) {
      throw new Error(`Перемещение уже находится в статусе ${transfer.status}`);
    }

    return await prisma.$transaction(async (tx: any) => {
      // Deduct stock from source warehouse
      for (const item of transfer.items) {
        const stock = await tx.stockItem.findUnique({
          where: {
            warehouseId_nomenclatureId: {
              warehouseId: transfer.sourceWarehouseId,
              nomenclatureId: item.nomenclatureId,
            },
          },
          include: { nomenclature: true },
        });

        const currentQty = stock ? Number(stock.quantity) : 0;
        const itemQty = Number(item.quantity);
        if (currentQty < itemQty) {
          throw new Error(`Недостаточно остатка для "${stock?.nomenclature.name || 'ТМЦ'}". Доступно: ${currentQty}, требуется: ${itemQty}`);
        }

        await tx.stockItem.update({
          where: {
            warehouseId_nomenclatureId: {
              warehouseId: transfer.sourceWarehouseId,
              nomenclatureId: item.nomenclatureId,
            },
          },
          data: { quantity: { decrement: itemQty } },
        });
      }

      return await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: StockTransferStatus.IN_TRANSIT,
          dispatchedAt: new Date(),
        },
      });
    });
  }

  /**
   * Receives a transfer at destination (changes status to COMPLETED, increments target warehouse stock)
   */
  static async receiveStockTransfer(dto: StockTransferReceiveDto) {
    const { transferId, userId } = dto;
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });

    if (!transfer) throw new Error('Перемещение не найдено');
    if (transfer.status !== StockTransferStatus.IN_TRANSIT) {
      throw new Error(`Принять можно только перемещение в пути (IN_TRANSIT). Текущий статус: ${transfer.status}`);
    }

    return await prisma.$transaction(async (tx: any) => {
      // Add stock to target warehouse
      for (const item of transfer.items) {
        const itemQty = Number(item.quantity);
        await tx.stockItem.upsert({
          where: {
            warehouseId_nomenclatureId: {
              warehouseId: transfer.targetWarehouseId,
              nomenclatureId: item.nomenclatureId,
            },
          },
          update: { quantity: { increment: itemQty } },
          create: {
            warehouseId: transfer.targetWarehouseId,
            nomenclatureId: item.nomenclatureId,
            quantity: itemQty,
          },
        });
      }

      return await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: StockTransferStatus.COMPLETED,
          receivedAt: new Date(),
          receivedById: userId,
        },
      });
    });
  }

  /**
   * Rejects a stock transfer with rollback to source warehouse if already in transit
   */
  static async rejectStockTransfer(dto: StockTransferRejectDto) {
    const { transferId, userId, reason } = dto;
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });

    if (!transfer) throw new Error('Перемещение не найдено');
    if (transfer.status === StockTransferStatus.COMPLETED) {
      throw new Error('Нельзя отклонить уже завершенное перемещение');
    }
    if (transfer.status === StockTransferStatus.REJECTED) {
      throw new Error('Перемещение уже отклонено');
    }

    return await prisma.$transaction(async (tx: any) => {
      // If already in transit, goods left source warehouse; return them back
      if (transfer.status === StockTransferStatus.IN_TRANSIT) {
        for (const item of transfer.items) {
          const itemQty = Number(item.quantity);
          await tx.stockItem.upsert({
            where: {
              warehouseId_nomenclatureId: {
                warehouseId: transfer.sourceWarehouseId,
                nomenclatureId: item.nomenclatureId,
              },
            },
            update: { quantity: { increment: itemQty } },
            create: {
              warehouseId: transfer.sourceWarehouseId,
              nomenclatureId: item.nomenclatureId,
              quantity: itemQty,
            },
          });
        }
      }

      return await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: StockTransferStatus.REJECTED,
          rejectionReason: reason?.trim() || null,
        },
      });
    });
  }

  /**
   * Completes an inventory count sheet, calculates discrepancies, and adjusts balances.
   */
  static async completeInventory(dto: InventoryCompleteDto) {
    const { inventoryId, userId } = dto;
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: { items: true, warehouse: true },
    });

    if (!inventory) throw new Error('Инвентаризация не найдена');
    if (inventory.status === InventoryStatus.COMPLETED) {
      throw new Error('Инвентаризация уже завершена');
    }

    const { discrepancies } = reconcileInventoryCounts(
      inventory.items.map((i: any) => ({
        id: i.id,
        nomenclatureId: i.nomenclatureId,
        expectedQty: Number(i.expectedQuantity),
        actualQty: Number(i.actualQuantity ?? i.expectedQuantity),
      }))
    );

    return await prisma.$transaction(async (tx: any) => {
      // Apply discrepancies to stockItem table
      for (const disc of discrepancies) {
        if (disc.diffQty !== 0) {
          await tx.stockItem.upsert({
            where: {
              warehouseId_nomenclatureId: {
                warehouseId: inventory.warehouseId,
                nomenclatureId: disc.nomenclatureId,
              },
            },
            update: { quantity: disc.actualQty },
            create: {
              warehouseId: inventory.warehouseId,
              nomenclatureId: disc.nomenclatureId,
              quantity: disc.actualQty,
            },
          });
        }
      }

      return await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          status: InventoryStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    });
  }
}
