import { prisma, Prisma, OperationType, StockTransferStatus, InventoryStatus } from '@ems/database';
import { calculateStockIssue, validatePositiveQuantity, isDeductingOperation } from '../domain/stock-engine';
import { dispatchTransfer, receiveTransfer, rejectTransfer } from '../domain/transfer-engine';
import { reconcileInventoryCounts } from '../domain/inventory-engine';
import {
  CreateStockOperationDto,
  StockTransferDispatchDto,
  StockTransferReceiveDto,
  StockTransferRejectDto,
  InventoryCompleteDto,
} from '../types';

export class WarehouseService {
  /**
   * Executes a stock operation (receipt, issue, transfer issue, write-off)
   * within an atomic database transaction and generates non-blocking low stock notifications.
   */
  static async executeOperation(dto: CreateStockOperationDto) {
    const {
      warehouseId,
      targetWarehouseId,
      type,
      counterparty,
      recipientName,
      equipmentId,
      document,
      comment,
      items,
      userId,
    } = dto;

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

    const lowStockAlerts: { nomenclatureName: string; currentQty: number; minStock: number }[] = [];

    const op = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Validate stocks and deduct preconditions
      if (isIssue || type === OperationType.TRANSFER) {
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
      const operation = await tx.stockOperation.create({
        data: {
          warehouseId,
          type,
          counterparty: finalCounterparty,
          document: document?.trim() || null,
          comment:
            comment?.trim() ||
            (type === OperationType.TRANSFER ? (targetWarehouseName ? `Перемещение на склад "${targetWarehouseName}"` : `Перемещение на склад ID ${targetWarehouseId}`) : null),
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

          const remainingQty = Number(updatedStock.quantity);
          if (remainingQty < 0) {
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

          const minStock = updatedStock.nomenclature.minStock !== null ? Number(updatedStock.nomenclature.minStock) : null;
          if (minStock !== null && remainingQty <= minStock) {
            lowStockAlerts.push({
              nomenclatureName: updatedStock.nomenclature.name,
              currentQty: remainingQty,
              minStock,
            });
          }
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

          const remainingQty = Number(updatedStock.quantity);
          if (remainingQty < 0) {
            throw new Error(`Недостаточно остатка для "${updatedStock.nomenclature.name}". Исчерпан.`);
          }

          const minStock = updatedStock.nomenclature.minStock !== null ? Number(updatedStock.nomenclature.minStock) : null;
          if (minStock !== null && remainingQty <= minStock) {
            lowStockAlerts.push({
              nomenclatureName: updatedStock.nomenclature.name,
              currentQty: remainingQty,
              minStock,
            });
          }
        }
      }

      return operation;
    });

    // 4. Non-blocking generation of LOW_STOCK notifications
    if (lowStockAlerts.length > 0) {
      try {
        const alertMessages = lowStockAlerts
          .map((a) => `"${a.nomenclatureName}": осталось ${a.currentQty} (мин. ${a.minStock})`)
          .join('; ');

        await prisma.notification.create({
          data: {
            userId,
            title: 'Внимание: Достигнут минимальный остаток ТМЦ',
            message: `На складе снизился остаток: ${alertMessages}`,
            type: 'LOW_STOCK',
            link: '/wms/stock?lowStockOnly=true',
          },
        });
      } catch (notifErr) {
        console.warn('Non-blocking low stock notification error:', notifErr);
      }
    }

    return op;
  }

  /**
   * Dispatches a transfer (changes status to IN_TRANSIT, decrements source warehouse stock)
   */
  static async dispatchStockTransfer(dto: StockTransferDispatchDto) {
    const { transferId, userId } = dto;
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        sourceWarehouse: true,
        targetWarehouse: true,
        items: { include: { nomenclature: true } },
      },
    });

    if (!transfer) throw new Error('Перемещение не найдено');
    if (transfer.status !== StockTransferStatus.REQUESTED) {
      throw new Error(`Перемещение находится в статусе "${transfer.status}" и не может быть отгружено`);
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        select: { status: true },
      });
      if (!current || current.status !== StockTransferStatus.REQUESTED) {
        throw new Error('Перемещение уже находится в другом статусе или было отгружено');
      }

      for (const item of transfer.items) {
        const itemQty = Number(item.quantity);
        const stock = await tx.stockItem.findUnique({
          where: {
            warehouseId_nomenclatureId: {
              warehouseId: transfer.sourceWarehouseId,
              nomenclatureId: item.nomenclatureId,
            },
          },
          include: { nomenclature: { select: { name: true, unit: true } } },
        });

        const currentQty = stock ? Number(stock.quantity) : 0;
        if (currentQty < itemQty) {
          const nomName = item.nomenclature?.name || stock?.nomenclature?.name || 'ТМЦ';
          const nomUnit = item.nomenclature?.unit || stock?.nomenclature?.unit || 'шт';
          throw new Error(
            `Недостаточно остатка на складе "${transfer.sourceWarehouse.name}" для позиции "${nomName}". Доступно: ${currentQty} ${nomUnit}, требуется: ${itemQty} ${nomUnit}`
          );
        }

        const updated = await tx.stockItem.update({
          where: { id: stock!.id },
          data: { quantity: currentQty - itemQty },
        });

        if (Number(updated.quantity) < 0) {
          throw new Error(
            `Остаток для "${item.nomenclature?.name || 'ТМЦ'}" на складе "${transfer.sourceWarehouse.name}" не может быть отрицательным.`
          );
        }
      }

      return await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: StockTransferStatus.IN_TRANSIT,
          dispatchedAt: new Date(),
          dispatchedById: userId,
        },
        include: {
          sourceWarehouse: true,
          targetWarehouse: true,
          items: { include: { nomenclature: true } },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /**
   * Receives a transfer at destination (changes status to COMPLETED, increments target warehouse stock)
   */
  static async receiveStockTransfer(dto: StockTransferReceiveDto) {
    const { transferId, userId, cellAllocations = [] } = dto;
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        sourceWarehouse: true,
        targetWarehouse: true,
        createdBy: { select: { id: true, displayName: true } },
        items: { include: { nomenclature: true, targetCell: true } },
      },
    });

    if (!transfer) throw new Error('Перемещение не найдено');
    if (transfer.status !== StockTransferStatus.IN_TRANSIT) {
      throw new Error(`Принять можно только перемещение в пути (IN_TRANSIT). Текущий статус: ${transfer.status}`);
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        select: { status: true },
      });
      if (!current || current.status !== StockTransferStatus.IN_TRANSIT) {
        throw new Error('Перемещение уже принято или статус был изменен');
      }

      for (const item of transfer.items) {
        const qtyToReceive = Number(item.quantity);
        const cellAlloc = cellAllocations.find((c) => c.itemId === item.id);
        const targetCellId = cellAlloc?.targetCellId || item.targetCellId || null;

        if (targetCellId) {
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { targetCellId },
          });
        }

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
              cellId: targetCellId || null,
            },
          });
        }
      }

      // Создаем запись в журнале складских операций StockOperation
      await tx.stockOperation.create({
        data: {
          warehouseId: transfer.targetWarehouseId,
          type: OperationType.TRANSFER,
          date: new Date(),
          counterparty: `Склад-отправитель: ${transfer.sourceWarehouse.name} (${transfer.sourceWarehouse.code})`,
          document: `Перемещение № ${transfer.transferNumber}`,
          comment: `Принято по межскладскому перемещению. Инициатор: ${transfer.createdBy?.displayName || 'Инициатор перемещения'}${transfer.requestReason ? `. Основание: ${transfer.requestReason}` : ''}`,
          createdById: userId,
          items: {
            create: transfer.items.map((it) => ({
              nomenclatureId: it.nomenclatureId,
              quantity: it.quantity,
            })),
          },
        },
      });

      return await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: StockTransferStatus.COMPLETED,
          receivedAt: new Date(),
          receivedById: userId,
        },
        include: {
          sourceWarehouse: true,
          targetWarehouse: true,
          items: { include: { nomenclature: true, targetCell: true } },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /**
   * Rejects a stock transfer with rollback to source warehouse if already in transit
   */
  static async rejectStockTransfer(dto: StockTransferRejectDto) {
    const { transferId, userId, reason } = dto;
    if (!reason || reason.trim().length < 3) {
      throw new Error('Укажите причину / основание отклонения (не менее 3 символов)');
    }

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        sourceWarehouse: true,
        targetWarehouse: true,
        items: { include: { nomenclature: true } },
      },
    });

    if (!transfer) throw new Error('Перемещение не найдено');
    if (transfer.status !== StockTransferStatus.IN_TRANSIT && transfer.status !== StockTransferStatus.REQUESTED) {
      throw new Error(`Перемещение в статусе "${transfer.status}" не может быть отклонено`);
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        select: { status: true },
      });
      if (!current || (current.status !== StockTransferStatus.IN_TRANSIT && current.status !== StockTransferStatus.REQUESTED)) {
        throw new Error('Перемещение уже изменило статус или было обработано');
      }

      // If the transaction observes IN_TRANSIT, goods left source warehouse; return them back.
      if (current.status === StockTransferStatus.IN_TRANSIT) {
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
              data: { quantity: Number(stock.quantity) + qtyToRestore },
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
      }

      return await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: StockTransferStatus.REJECTED,
          rejectedAt: new Date(),
          rejectedById: userId,
          rejectionReason: reason.trim(),
        },
        include: {
          sourceWarehouse: true,
          targetWarehouse: true,
          items: { include: { nomenclature: true } },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /**
   * Completes an inventory count sheet, calculates discrepancies, and adjusts balances.
   */
  static async completeInventory(dto: InventoryCompleteDto) {
    const { inventoryId, userId, comment, items } = dto;
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        warehouse: true,
        items: { include: { nomenclature: true } },
      },
    });

    if (!inventory) throw new Error('Акт инвентаризации не найден');
    if (inventory.status === InventoryStatus.COMPLETED) {
      throw new Error('Данная инвентаризация уже завершена и закрыта для изменений');
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Update items if provided
      if (Array.isArray(items)) {
        for (const item of items) {
          const existingItem = inventory.items.find((i: { id: string }) => i.id === item.id);
          if (existingItem) {
            const actual = Number(item.actualQty);
            const expected = Number(existingItem.expectedQty);
            const diff = actual - expected;

            await tx.inventoryItem.update({
              where: { id: item.id },
              data: {
                actualQty: actual,
                diffQty: diff,
                comment: item.comment !== undefined ? item.comment : undefined,
              },
            });
          }
        }
      }

      // 2. Read refreshed items
      const refreshedItems = await tx.inventoryItem.findMany({
        where: { inventoryId },
        include: { nomenclature: true },
      });

      const discrepancyItems = refreshedItems.filter((i) => i.diffQty !== null && Number(i.diffQty) !== 0);

      // 3. Create ADJUSTMENT StockOperation if discrepancies exist
      if (discrepancyItems.length > 0) {
        await tx.stockOperation.create({
          data: {
            warehouseId: inventory.warehouseId,
            type: OperationType.ADJUSTMENT,
            document: `Акт инвентаризации № ${inventoryId.slice(-6).toUpperCase()}`,
            comment: 'Автоматическая корректировка по результатам инвентаризации',
            createdById: userId,
            items: {
              create: discrepancyItems.map((item: { nomenclatureId: string; diffQty: any }) => ({
                nomenclatureId: item.nomenclatureId,
                quantity: Math.abs(Number(item.diffQty)),
              })),
            },
          },
        });

        // Update balances to actual quantities
        for (const item of refreshedItems) {
          if (item.actualQty !== null) {
            await tx.stockItem.upsert({
              where: {
                warehouseId_nomenclatureId: {
                  warehouseId: inventory.warehouseId,
                  nomenclatureId: item.nomenclatureId,
                },
              },
              update: {
                quantity: item.actualQty,
              },
              create: {
                warehouseId: inventory.warehouseId,
                nomenclatureId: item.nomenclatureId,
                quantity: item.actualQty,
              },
            });
          }
        }
      }

      // 4. Close inventory
      const updated = await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          status: InventoryStatus.COMPLETED,
          closedAt: new Date(),
          comment: comment !== undefined ? comment : undefined,
        },
      });

      return {
        inventory: updated,
        discrepanciesCount: discrepancyItems.length,
      };
    });
  }
}
