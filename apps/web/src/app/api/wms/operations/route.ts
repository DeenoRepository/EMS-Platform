import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, OperationType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId')?.trim() || '';
    const type = searchParams.get('type')?.trim() as OperationType | undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)));

    const isAdmin =
      user.roles.includes('admin') ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    let userWarehouseIds: string[] = [];
    if (!isAdmin) {
      const userWhs = await prisma.warehouse.findMany({
        where: { responsibleUserId: user.userId },
        select: { id: true },
      });
      userWarehouseIds = userWhs.map((w) => w.id);
    }

    const where: any = {};
    if (!isAdmin) {
      if (userWarehouseIds.length > 0) {
        if (warehouseId) {
          if (!userWarehouseIds.includes(warehouseId)) {
            return forbiddenResponse('Вы можете просматривать операции только по закрепленным за вами складам.');
          }
          where.warehouseId = warehouseId;
        } else {
          where.OR = [
            { warehouseId: { in: userWarehouseIds } },
            { createdById: user.userId },
          ];
        }
      } else {
        where.createdById = user.userId;
      }
    } else if (warehouseId) {
      where.warehouseId = warehouseId;
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
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_OPERATIONS_CREATE)) return forbiddenResponse();

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

    const isIssue = type === 'ISSUE' || type === 'ISSUE_EMPLOYEE' || type === 'ISSUE_WRITE_OFF';

    let targetWarehouseName = '';
    if (type === 'TRANSFER') {
      if (!targetWarehouseId) {
        return NextResponse.json({ success: false, error: 'Для перемещения необходимо указать склад-получатель' }, { status: 400 });
      }
      if (warehouseId === targetWarehouseId) {
        return NextResponse.json({ success: false, error: 'Склад-отправитель и склад-получатель не могут совпадать' }, { status: 400 });
      }
      const targetWarehouse = await prisma.warehouse.findUnique({
        where: { id: targetWarehouseId },
        select: { id: true, name: true, isActive: true },
      });
      if (!targetWarehouse || !targetWarehouse.isActive) {
        return NextResponse.json({ success: false, error: 'Склад-получатель не найден или неактивен' }, { status: 400 });
      }
      targetWarehouseName = targetWarehouse.name;
    }

    // Проверка прав на склад (ответственное лицо или администратор)
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true, responsibleUserId: true },
    });

    if (!warehouse) {
      return NextResponse.json({ success: false, error: 'Склад не найден' }, { status: 404 });
    }

    const isAdmin =
      user.roles.includes('admin') ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    if (!isAdmin && warehouse.responsibleUserId !== user.userId) {
      return forbiddenResponse(`Вы не являетесь ответственным лицом за склад "${warehouse.name}". Выполнение операций разрешено только назначенному материально ответственному лицу.`);
    }

    // Выполняем транзакцию изменения остатков с жестким контролем
    const lowStockAlerts: { nomenclatureName: string; currentQty: number; minStock: number }[] = [];

    const finalCounterparty =
      counterparty?.trim() ||
      (type === 'ISSUE_EMPLOYEE' && recipientName?.trim() ? `Сотрудник: ${recipientName.trim()}` : null);

    const operation = await prisma.$transaction(async (tx) => {
      // 1. Проверяем остатки при списании и перемещении
      if (isIssue || type === 'TRANSFER') {
        for (const item of items) {
          if (item.quantity <= 0) {
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
          comment: comment?.trim() || (type === 'TRANSFER' ? (targetWarehouseName ? `Перемещение на склад "${targetWarehouseName}"` : `Перемещение на склад ID ${targetWarehouseId}`) : null),
          createdById: user.userId,
          items: {
            create: items.map((i) => ({
              nomenclatureId: i.nomenclatureId,
              quantity: i.quantity,
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
        const qtyNum = Number(item.quantity);

        if (type === 'RECEIPT') {
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

          // Проверка на минимальный остаток
          const remainingQty = Number(updatedStock.quantity);
          const minStock = updatedStock.nomenclature.minStock !== null ? Number(updatedStock.nomenclature.minStock) : null;
          if (minStock !== null && remainingQty <= minStock) {
            lowStockAlerts.push({
              nomenclatureName: updatedStock.nomenclature.name,
              currentQty: remainingQty,
              minStock,
            });
          }
        } else if (type === 'TRANSFER' && targetWarehouseId) {
          // Списание с исходного склада
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

          // Зачисление на целевой склад
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

          const remainingQty = Number(updatedStock.quantity);
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
      });
    }

    // 5. Логирование аудита
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'StockOperation',
      entityId: operation.id,
      changes: {
        warehouseId,
        type,
        itemsCount: items.length,
        document,
      },
    });

    return NextResponse.json({ success: true, data: operation });
  } catch (error: any) {
    console.error('Ошибка проведения складской операции:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка проведения складской операции' },
      { status: error.message?.includes('Недостаточно') || error.message?.includes('больше нуля') ? 400 : 500 }
    );
  }
}
