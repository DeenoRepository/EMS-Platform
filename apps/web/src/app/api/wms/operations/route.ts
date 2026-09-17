import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, OperationType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { canManageWarehouse, isWmsAdmin } from '@/lib/wms-access';
import { parseMovementQuantity } from '@/lib/wms-validation';
import { assertNoActiveInventory } from '@/lib/wms-inventory-lock';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId')?.trim() || '';
    const nomenclatureId = searchParams.get('nomenclatureId')?.trim() || '';
    const type = searchParams.get('type')?.trim() as OperationType | undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '25', 10)));

    const isAdmin = isWmsAdmin(user);

    const where: any = {};
    if (warehouseId) {
      if (!isAdmin) {
        const assignedWarehouse = await prisma.warehouse.findFirst({
          where: { id: warehouseId, responsibleUserId: user.userId, isActive: true, deletedAt: null },
          select: { id: true },
        });
        if (!assignedWarehouse) return forbiddenResponse('Нет доступа к выбранному складу');
      }
      where.warehouseId = warehouseId;
    } else if (!isAdmin) {
      const assignedWarehouses = await prisma.warehouse.findMany({
        where: { responsibleUserId: user.userId, isActive: true, deletedAt: null },
        select: { id: true },
      });
      where.warehouseId = { in: assignedWarehouses.map((warehouse) => warehouse.id) };
    }

    if (nomenclatureId) {
      where.items = {
        some: {
          nomenclatureId,
        },
      };
    }

    if (type && type in OperationType) {
      where.type = type;
    }

    const [total, operations] = await Promise.all([
      prisma.stockOperation.count({ where }),
      prisma.stockOperation.findMany({
        where,
        include: {
          warehouse: true,
          createdBy: {
            select: { id: true, displayName: true, ldapLogin: true },
          },
          items: {
            include: {
              nomenclature: {
                select: { id: true, name: true, article: true, unit: true },
              },
              equipment: {
                select: { id: true, name: true, inventoryNumber: true },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: operations,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error('Ошибка получения операций:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения журнала операций' }, { status: 500 });
  }
}

interface OperationItemInput {
  nomenclatureId: string;
  quantity: number;
  equipmentId?: string | null;
  cellId?: string | null;
  price?: number | null;
  batchNumber?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, PERMISSIONS.WMS_OPERATIONS_CREATE);
    if (auth.errorResponse) return auth.errorResponse;
    const { user } = auth;

    const body = await req.json();
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
    }: {
      warehouseId: string;
      targetWarehouseId?: string;
      type: OperationType;
      counterparty?: string;
      recipientName?: string;
      equipmentId?: string;
      document?: string;
      comment?: string;
      items: OperationItemInput[];
    } = body;

    if (!warehouseId) {
      return NextResponse.json({ success: false, error: 'Укажите склад операции' }, { status: 400 });
    }

    if (!type || !(type in OperationType)) {
      return NextResponse.json({ success: false, error: 'Укажите корректный тип операции' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Добавьте хотя бы одну позицию ТМЦ' }, { status: 400 });
    }

    const normalizedItems = items.map((item) => ({
      ...item,
      quantity: parseMovementQuantity(item.quantity),
    }));
    if (normalizedItems.some((item) => item.quantity === null)) {
      return NextResponse.json({ success: false, error: 'Все количества должны быть конечными числами больше нуля' }, { status: 400 });
    }
    if (new Set(normalizedItems.map((item) => item.nomenclatureId)).size !== normalizedItems.length) {
      return NextResponse.json({ success: false, error: 'Одна номенклатура не может повторяться в одном документе' }, { status: 400 });
    }

    if (type === 'TRANSFER' || type === 'ADJUSTMENT') {
      return NextResponse.json(
        {
          success: false,
          error: 'Тип операции временно недоступен: используйте специализированный workflow перемещения или инвентаризации',
        },
        { status: 400 }
      );
    }

    const isIssue = type === 'ISSUE' || type === 'ISSUE_EMPLOYEE' || type === 'ISSUE_WRITE_OFF';

    // Проверка прав на склад (ответственное лицо или администратор)
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true, responsibleUserId: true, isActive: true, deletedAt: true },
    });

    if (!warehouse || !warehouse.isActive || warehouse.deletedAt) {
      return NextResponse.json({ success: false, error: 'Склад не найден' }, { status: 404 });
    }

    const isAdmin =
      user.roles.includes('admin') ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    if (!canManageWarehouse(user, warehouse.responsibleUserId)) {
      return forbiddenResponse(`Вы не являетесь ответственным лицом за склад "${warehouse.name}". Выполнение операций разрешено только назначенному материально ответственному лицу.`);
    }

    try {
      await assertNoActiveInventory([warehouseId]);
    } catch (error) {
      if (error instanceof Error && error.message === 'WMS_INVENTORY_LOCKED') {
        return NextResponse.json({ success: false, error: 'На складе проводится инвентаризация. Складские операции временно заблокированы.' }, { status: 409 });
      }
      throw error;
    }

    const cellIds = items.map((item) => item.cellId).filter((cellId): cellId is string => Boolean(cellId));
    if (cellIds.length > 0) {
      const cells = await prisma.storageCell.findMany({
        where: { id: { in: cellIds }, deletedAt: null },
        include: { zone: { select: { warehouseId: true } } },
      });
      if (cells.length !== new Set(cellIds).size || cells.some((cell) => cell.zone.warehouseId !== warehouseId)) {
        return NextResponse.json({ success: false, error: 'Каждая ячейка должна принадлежать складу операции' }, { status: 400 });
      }
    }

    // Выполняем транзакцию изменения остатков с жестким контролем
    const lowStockAlerts: { nomenclatureName: string; currentQty: number; minStock: number }[] = [];

    const finalCounterparty =
      counterparty?.trim() ||
      (type === 'ISSUE_EMPLOYEE' && recipientName?.trim() ? `Сотрудник: ${recipientName.trim()}` : null);

    const operation = await prisma.$transaction(async (tx) => {
      await assertNoActiveInventory([warehouseId], tx);

      // 1. Проверяем остатки при списании и перемещении
      if (isIssue) {
        for (const item of items) {
          if (item.quantity === null || item.quantity <= 0) {
            throw new Error('Количество позиции должно быть больше нуля');
          }

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
          if (currentQty < item.quantity) {
            const nomName = stock?.nomenclature.name || 'ТМЦ';
            throw new Error(`Недостаточно остатка для "${nomName}". Доступно на складе: ${currentQty}, требуется: ${item.quantity}`);
          }
        }
      }

      // 2. Создаем запись операции (документ опционален)
      const op = await tx.stockOperation.create({
        data: {
          warehouseId,
          type,
          counterparty: finalCounterparty,
          document: document?.trim() || null,
          comment: comment?.trim() || null,
          createdById: user.userId,
          items: {
            create: items.map((i) => ({
              nomenclatureId: i.nomenclatureId,
               quantity: normalizedItems.find((normalized) => normalized.nomenclatureId === i.nomenclatureId)?.quantity as number,
              equipmentId: i.equipmentId || (type === 'ISSUE_WRITE_OFF' && equipmentId ? equipmentId : null),
            })),
          },
        },
        include: {
          items: {
            include: { nomenclature: true },
          },
        },
      });

      // 3. Обновляем остатки
      for (const item of items) {
        const qtyNum = parseMovementQuantity(item.quantity);
        if (qtyNum === null) {
          throw new Error('Количество позиции должно быть больше нуля');
        }

        const existingStock = await tx.stockItem.findUnique({
          where: {
            warehouseId_nomenclatureId: {
              warehouseId,
              nomenclatureId: item.nomenclatureId,
            },
          },
          include: { nomenclature: true },
        });

        if (type === 'RECEIPT') {
          if (existingStock) {
            await tx.stockItem.update({
              where: { id: existingStock.id },
              data: {
                quantity: { increment: qtyNum },
              },
            });
          } else {
            await tx.stockItem.create({
              data: {
                warehouseId,
                nomenclatureId: item.nomenclatureId,
                quantity: qtyNum,
                cellId: item.cellId || null,
              },
            });
          }

          if (item.cellId) {
            await tx.stockCellBalance.upsert({
              where: {
                warehouseId_cellId_nomenclatureId: {
                  warehouseId,
                  cellId: item.cellId,
                  nomenclatureId: item.nomenclatureId,
                },
              },
              update: { quantity: { increment: qtyNum } },
              create: { warehouseId, cellId: item.cellId, nomenclatureId: item.nomenclatureId, quantity: qtyNum },
            });
          }

          // Связь запчасти с оборудованием (EPS) при указании
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
        } else if (isIssue) {
          if (!existingStock) {
            throw new Error('Позиция номенклатуры отсутствует на складе');
          }

          const currentQty = Number(existingStock.quantity);
          const remainingQty = currentQty - qtyNum;
          if (remainingQty < 0) {
            throw new Error(`Недостаточно остатка для "${existingStock.nomenclature.name}". Доступный остаток исчерпан.`);
          }

          const changed = await tx.stockItem.updateMany({
            where: { id: existingStock.id, quantity: { gte: qtyNum } },
            data: { quantity: { decrement: qtyNum } },
          });
          if (changed.count !== 1) {
            throw new Error(`Недостаточно остатка для "${existingStock.nomenclature.name}". Остаток изменился параллельно.`);
          }

          if (item.cellId) {
            const cellChanged = await tx.stockCellBalance.updateMany({
              where: {
                warehouseId,
                cellId: item.cellId,
                nomenclatureId: item.nomenclatureId,
                quantity: { gte: qtyNum },
              },
              data: { quantity: { decrement: qtyNum } },
            });
            if (cellChanged.count !== 1) {
              throw new Error(`Недостаточно остатка в ячейке для "${existingStock.nomenclature.name}".`);
            }
          }

          const updatedStock = await tx.stockItem.findUniqueOrThrow({
            where: { id: existingStock.id },
            include: { nomenclature: true },
          });

          // Проверка на минимальный остаток суммарно по всей номенклатуре
          const minStock = updatedStock.nomenclature.minStock !== null ? Number(updatedStock.nomenclature.minStock) : null;
          if (minStock !== null) {
            const allItems = await tx.stockItem.findMany({
              where: { nomenclatureId: item.nomenclatureId },
              select: { quantity: true },
            });
            const totalRemaining = allItems.reduce((sum, s) => sum + Number(s.quantity), 0);
            if (totalRemaining <= minStock) {
              lowStockAlerts.push({
                nomenclatureName: updatedStock.nomenclature.name,
                currentQty: totalRemaining,
                minStock,
              });
            }
          }
        }
      }

      return op;
    });

    // 4. Генерация системных уведомлений о дефиците (LOW_STOCK)
    if (lowStockAlerts.length > 0) {
      // Отправляем уведомление текущему пользователю и администраторам
      const alertMessages = lowStockAlerts
        .map((a) => `"${a.nomenclatureName}": осталось ${a.currentQty} (мин. ${a.minStock})`)
        .join('; ');

      await prisma.notification.create({
        data: {
          userId: user.userId,
          title: 'Внимание: Достигнут минимальный остаток ТМЦ',
          message: `На складе снизился остаток: ${alertMessages}`,
          type: 'LOW_STOCK',
          link: '/wms/stock?lowStockOnly=true',
        },
      }).catch((error) => console.error('Не удалось создать уведомление о дефиците:', error));
    }

    // 5. Логирование аудита
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'StockOperation',
      entityId: operation.id,
      changes: { warehouseId, type, itemsCount: items.length, document },
    }).catch((error) => console.error('Не удалось записать аудит складской операции:', error));

    return NextResponse.json({ success: true, data: operation });
  } catch (error: any) {
    console.error('Ошибка проведения складской операции:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка проведения складской операции' },
      { status: error.message?.includes('Недостаточно') || error.message?.includes('больше нуля') ? 400 : 500 }
    );
  }
}
