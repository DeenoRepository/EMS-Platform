import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, OperationType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

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

    const isAdmin =
      user.roles.includes('admin') ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    const where: any = {};
    if (warehouseId) {
      where.warehouseId = warehouseId;
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка получения операций:', message);
    return NextResponse.json({ success: false, error: 'Ошибка получения журнала операций', details: message }, { status: 500 });
  }
}

const OperationItemSchema = z.object({
  nomenclatureId: z.string().min(1, 'Укажите номенклатуру'),
  quantity: z.number().positive('Количество позиции должно быть больше нуля'),
  equipmentId: z.string().nullable().optional(),
  cellId: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  batchNumber: z.string().nullable().optional(),
});

const StockOperationSchema = z.object({
  warehouseId: z.string().min(1, 'Укажите склад операции'),
  targetWarehouseId: z.string().optional(),
  type: z.nativeEnum(OperationType, { message: 'Укажите корректный тип операции' }),
  counterparty: z.string().optional(),
  recipientName: z.string().optional(),
  equipmentId: z.string().optional(),
  document: z.string().optional(),
  comment: z.string().optional(),
  items: z.array(OperationItemSchema).min(1, 'Добавьте хотя бы одну позицию ТМЦ'),
});

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'wms-operations-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_OPERATIONS_CREATE)) return forbiddenResponse();

    const rawBody = await req.json();
    const parseResult = StockOperationSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues[0]?.message || 'Некорректные входные данные' },
        { status: 400 }
      );
    }

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
    } = parseResult.data;

    const isIssue = type === 'ISSUE' || type === 'ISSUE_EMPLOYEE' || type === 'ISSUE_WRITE_OFF';

    let targetWarehouseName = '';
    let targetWarehouseCode = '';
    if (type === 'TRANSFER') {
      if (!targetWarehouseId) {
        return NextResponse.json({ success: false, error: 'Для перемещения необходимо указать склад-получатель' }, { status: 400 });
      }
      if (warehouseId === targetWarehouseId) {
        return NextResponse.json({ success: false, error: 'Склад-отправитель и склад-получатель не могут совпадать' }, { status: 400 });
      }
      const targetWarehouse = await prisma.warehouse.findUnique({
        where: { id: targetWarehouseId },
        select: { id: true, name: true, code: true, isActive: true },
      });
      if (!targetWarehouse || !targetWarehouse.isActive) {
        return NextResponse.json({ success: false, error: 'Склад-получатель не найден или неактивен' }, { status: 400 });
      }
      targetWarehouseName = targetWarehouse.name;
      targetWarehouseCode = targetWarehouse.code;
    }

    // Проверка прав на склад (ответственное лицо или администратор)
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, name: true, code: true, responsibleUserId: true },
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
      (type === 'TRANSFER' && targetWarehouseName
        ? `Склад-получатель: ${targetWarehouseName}${targetWarehouseCode ? ` (${targetWarehouseCode})` : ''}`
        : null) ||
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
              quantity: Number(i.quantity),
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
        if (isNaN(qtyNum) || qtyNum <= 0) {
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
          let verifiedCellId: string | null = null;
          if (item.cellId) {
            const cell = await tx.storageCell.findUnique({
              where: { id: item.cellId },
              include: { zone: true },
            });
            if (!cell) {
              throw new Error('Выбранная ячейка хранения не найдена');
            }
            if (cell.zone.warehouseId !== warehouseId) {
              throw new Error('Выбранная ячейка хранения принадлежит другому складу');
            }
            verifiedCellId = item.cellId;
          }

          await tx.stockItem.upsert({
            where: {
              warehouseId_nomenclatureId: {
                warehouseId,
                nomenclatureId: item.nomenclatureId,
              },
            },
            update: {
              quantity: { increment: qtyNum },
              ...(verifiedCellId ? { cellId: verifiedCellId } : {}),
            },
            create: {
              warehouseId,
              nomenclatureId: item.nomenclatureId,
              quantity: qtyNum,
              cellId: verifiedCellId,
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
          // Guarded atomic decrement: guarantees no overdraft under concurrent execution
          const decrementResult = await tx.stockItem.updateMany({
            where: {
              warehouseId,
              nomenclatureId: item.nomenclatureId,
              quantity: { gte: qtyNum },
            },
            data: {
              quantity: { decrement: qtyNum },
            },
          });

          if (decrementResult.count === 0) {
            const currentItem = await tx.stockItem.findUnique({
              where: {
                warehouseId_nomenclatureId: {
                  warehouseId,
                  nomenclatureId: item.nomenclatureId,
                },
              },
              include: { nomenclature: true },
            });
            const nomName = currentItem?.nomenclature?.name || 'ТМЦ';
            const available = currentItem ? Number(currentItem.quantity) : 0;
            throw new Error(`Недостаточно остатка для "${nomName}". Доступно на складе: ${available}, требуется: ${qtyNum}`);
          }

          const updatedStock = await tx.stockItem.findUnique({
            where: {
              warehouseId_nomenclatureId: {
                warehouseId,
                nomenclatureId: item.nomenclatureId,
              },
            },
            include: { nomenclature: true },
          });

          // Проверка на минимальный остаток суммарно по всей номенклатуре
          if (updatedStock && updatedStock.nomenclature.minStock !== null) {
            const minStock = Number(updatedStock.nomenclature.minStock);
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
        } else if (type === 'TRANSFER' && targetWarehouseId) {
          // Guarded atomic decrement from source warehouse
          const decrementResult = await tx.stockItem.updateMany({
            where: {
              warehouseId,
              nomenclatureId: item.nomenclatureId,
              quantity: { gte: qtyNum },
            },
            data: {
              quantity: { decrement: qtyNum },
            },
          });

          if (decrementResult.count === 0) {
            const currentItem = await tx.stockItem.findUnique({
              where: {
                warehouseId_nomenclatureId: {
                  warehouseId,
                  nomenclatureId: item.nomenclatureId,
                },
              },
              include: { nomenclature: true },
            });
            const nomName = currentItem?.nomenclature?.name || 'ТМЦ';
            const available = currentItem ? Number(currentItem.quantity) : 0;
            throw new Error(`Недостаточно остатка для перемещения "${nomName}". Доступно на складе: ${available}, требуется: ${qtyNum}`);
          }

          // Atomic upsert with increment on target warehouse
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

          const updatedStock = await tx.stockItem.findUnique({
            where: {
              warehouseId_nomenclatureId: {
                warehouseId,
                nomenclatureId: item.nomenclatureId,
              },
            },
            include: { nomenclature: true },
          });

          // При перемещении между складами общий остаток ТМЦ на предприятии не уменьшается
          if (updatedStock && updatedStock.nomenclature.minStock !== null) {
            const minStock = Number(updatedStock.nomenclature.minStock);
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

      // 4. Для прямого перемещения создаем симметричную входящую запись на складе-получателе
      if (type === 'TRANSFER' && targetWarehouseId) {
        await tx.stockOperation.create({
          data: {
            warehouseId: targetWarehouseId,
            type: 'TRANSFER',
            counterparty: `Склад-отправитель: ${warehouse.name} (${warehouse.code})`,
            document: document?.trim() || null,
            comment: comment?.trim() || `Принято по прямому перемещению со склада "${warehouse.name}"`,
            createdById: user.userId,
            items: {
              create: items.map((i) => ({
                nomenclatureId: i.nomenclatureId,
                quantity: Number(i.quantity),
              })),
            },
          },
        });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ошибка проведения складской операции';
    console.error('Ошибка проведения складской операции:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes('Недостаточно') || message.includes('больше нуля') ? 400 : 500 }
    );
  }
}
