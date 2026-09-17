import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, StockTransferStatus, StockReservationStatus, OperationType, Prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { canManageWarehouse, isWmsAdmin } from '@/lib/wms-access';
import { parseMovementQuantity } from '@/lib/wms-validation';
import { assertNoActiveInventory } from '@/lib/wms-inventory-lock';

export const dynamic = 'force-dynamic';

// GET /api/wms/transfers - Список перемещений и заявок
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'all'; // inbound, requests, outbound, my_requests, all
    const status = searchParams.get('status') as StockTransferStatus | undefined;
    const warehouseId = searchParams.get('warehouseId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)));
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    const isAdmin = isWmsAdmin(user);

    // Находим склады пользователя, если он не админ
    let userWarehouseIds: string[] = [];
    if (warehouseId) {
      if (!isAdmin) {
        const assignedWarehouse = await prisma.warehouse.findFirst({
          where: { id: warehouseId, responsibleUserId: user.userId, isActive: true, deletedAt: null },
          select: { id: true },
        });
        if (!assignedWarehouse) return forbiddenResponse('Нет доступа к выбранному складу');
      }
      userWarehouseIds = [warehouseId];
    } else if (!isAdmin) {
      const userWhs = await prisma.warehouse.findMany({
        where: { responsibleUserId: user.userId, isActive: true, deletedAt: null },
        select: { id: true },
      });
      userWarehouseIds = userWhs.map((w) => w.id);
    }

    const where: Prisma.StockTransferWhereInput = {};

    if (status && Object.values(StockTransferStatus).includes(status)) {
      where.status = status;
    }

    if (warehouseId) {
      if (mode === 'inbound') {
        where.targetWarehouseId = warehouseId;
        where.status = { in: [StockTransferStatus.IN_TRANSIT, StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION] };
      } else if (mode === 'requests') {
        where.sourceWarehouseId = warehouseId;
        where.status = StockTransferStatus.REQUESTED;
      } else if (mode === 'outbound') {
        where.sourceWarehouseId = warehouseId;
        where.status = { in: [StockTransferStatus.IN_TRANSIT, StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION] };
      } else if (mode === 'my_requests') {
        where.createdById = user.userId;
        if (!status) where.status = StockTransferStatus.REQUESTED;
      } else {
        where.OR = [
          { sourceWarehouseId: warehouseId },
          { targetWarehouseId: warehouseId },
        ];
      }
    } else {
      if (mode === 'inbound') {
          where.status = { in: [StockTransferStatus.IN_TRANSIT, StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION] };
      } else if (mode === 'requests') {
        where.status = StockTransferStatus.REQUESTED;
      } else if (mode === 'outbound') {
          where.status = { in: [StockTransferStatus.IN_TRANSIT, StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION] };
      } else if (mode === 'my_requests') {
        where.createdById = user.userId;
        if (!status) where.status = StockTransferStatus.REQUESTED;
      }
      // mode === 'all' -> без ограничений
    }

    if (!isAdmin) {
      const scope = userWarehouseIds.length > 0 ? userWarehouseIds : ['__no_access__'];
      const existingAnd = where.AND
        ? (Array.isArray(where.AND) ? where.AND : [where.AND])
        : [];
      where.AND = [
        ...existingAnd,
        {
          OR: [
            { sourceWarehouseId: { in: scope } },
            { targetWarehouseId: { in: scope } },
            { createdById: user.userId },
          ],
        },
      ];
    }

    const andConditions: Prisma.StockTransferWhereInput[] = where.AND
      ? (Array.isArray(where.AND) ? where.AND : [where.AND])
      : [];

    if (search) {
      andConditions.push({
        OR: [
          { transferNumber: { contains: search, mode: 'insensitive' } },
          { requestReason: { contains: search, mode: 'insensitive' } },
          { rejectionReason: { contains: search, mode: 'insensitive' } },
          { sourceWarehouse: { name: { contains: search, mode: 'insensitive' } } },
          { targetWarehouse: { name: { contains: search, mode: 'insensitive' } } },
          {
            items: {
              some: {
                nomenclature: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) where.AND = andConditions;

    const [total, items] = await Promise.all([
      prisma.stockTransfer.count({ where }),
      prisma.stockTransfer.findMany({
        where,
        include: {
          sourceWarehouse: {
            select: {
              id: true,
              name: true,
              code: true,
              responsibleUser: { select: { id: true, displayName: true } },
            },
          },
          targetWarehouse: {
            select: {
              id: true,
              name: true,
              code: true,
              responsibleUser: { select: { id: true, displayName: true } },
            },
          },
          createdBy: { select: { id: true, displayName: true } },
          dispatchedBy: { select: { id: true, displayName: true } },
          receivedBy: { select: { id: true, displayName: true } },
          rejectedBy: { select: { id: true, displayName: true } },
          items: {
            include: {
              nomenclature: {
                select: {
                  id: true,
                  name: true,
                  article: true,
                  unit: true,
                },
              },
              targetCell: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Подсчет счетчиков для вкладок
    let counts = { inbound: 0, requests: 0, outbound: 0, total };
    if (isAdmin) {
      const [inboundCount, requestsCount, outboundCount] = await Promise.all([
        prisma.stockTransfer.count({
          where: {
            ...(warehouseId ? { targetWarehouseId: warehouseId } : {}),
            status: { in: [StockTransferStatus.IN_TRANSIT, StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION] },
          },
        }),
        prisma.stockTransfer.count({
          where: {
            ...(warehouseId ? { sourceWarehouseId: warehouseId } : {}),
            status: StockTransferStatus.REQUESTED,
          },
        }),
        prisma.stockTransfer.count({
          where: {
            ...(warehouseId ? { sourceWarehouseId: warehouseId } : {}),
            status: { in: [StockTransferStatus.IN_TRANSIT, StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION] },
          },
        }),
      ]);
      counts = {
        inbound: inboundCount,
        requests: requestsCount,
        outbound: outboundCount,
        total,
      };
    } else if (userWarehouseIds.length > 0) {
      const targetWhFilter = warehouseId
        ? (userWarehouseIds.includes(warehouseId) ? [warehouseId] : [])
        : userWarehouseIds;

      const [inboundCount, requestsCount, outboundCount] = await Promise.all([
        prisma.stockTransfer.count({
          where: {
            targetWarehouseId: { in: targetWhFilter },
            status: { in: [StockTransferStatus.IN_TRANSIT, StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION] },
          },
        }),
        prisma.stockTransfer.count({
          where: {
            sourceWarehouseId: { in: targetWhFilter },
            status: StockTransferStatus.REQUESTED,
          },
        }),
        prisma.stockTransfer.count({
          where: {
            sourceWarehouseId: { in: targetWhFilter },
            status: StockTransferStatus.IN_TRANSIT,
          },
        }),
      ]);
      counts = {
        inbound: inboundCount,
        requests: requestsCount,
        outbound: outboundCount,
        total,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        counts,
      },
    });
  } catch (error: any) {
    console.error('Ошибка получения списка перемещений:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения списка перемещений' },
      { status: 500 }
    );
  }
}

interface TransferItemInput {
  nomenclatureId: string;
  quantity: number;
  targetCellId?: string | null;
}

// POST /api/wms/transfers - Создание перемещения или запроса на перемещение
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, PERMISSIONS.WMS_OPERATIONS_CREATE);
    if (auth.errorResponse) return auth.errorResponse;
    const { user } = auth;

    const body = await req.json();
    const {
      sourceWarehouseId,
      targetWarehouseId,
      isRequest = false,
      requestReason,
      items,
    }: {
      sourceWarehouseId: string;
      targetWarehouseId: string;
      isRequest?: boolean;
      requestReason?: string;
      items: TransferItemInput[];
    } = body;

    if (!sourceWarehouseId || !targetWarehouseId) {
      return NextResponse.json(
        { success: false, error: 'Укажите склад-отправитель и склад-получатель' },
        { status: 400 }
      );
    }

    if (sourceWarehouseId === targetWarehouseId) {
      return NextResponse.json(
        { success: false, error: 'Склад-отправитель и склад-получатель не могут совпадать' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Добавьте хотя бы одну позицию ТМЦ для перемещения' },
        { status: 400 }
      );
    }

    const normalizedItems = items.map((item) => ({
      ...item,
      quantity: parseMovementQuantity(item.quantity),
    }));
    if (normalizedItems.some((item) => item.quantity === null)) {
        return NextResponse.json(
          { success: false, error: 'Количество каждой позиции должно быть конечным числом больше нуля' },
          { status: 400 }
        );
    }
    if (new Set(normalizedItems.map((item) => item.nomenclatureId)).size !== normalizedItems.length) {
      return NextResponse.json(
        { success: false, error: 'Одна номенклатура не может повторяться в одном перемещении' },
        { status: 400 }
      );
    }

    const targetCellIds = normalizedItems.map((item) => item.targetCellId).filter((cellId): cellId is string => Boolean(cellId));
    if (targetCellIds.length > 0) {
      const cells = await prisma.storageCell.findMany({
        where: { id: { in: targetCellIds }, deletedAt: null },
        include: { zone: { select: { warehouseId: true } } },
      });
      if (cells.length !== new Set(targetCellIds).size || cells.some((cell) => cell.zone.warehouseId !== targetWarehouseId)) {
        return NextResponse.json({ success: false, error: 'Каждая ячейка назначения должна принадлежать целевому складу' }, { status: 400 });
      }
    }

    try {
      await assertNoActiveInventory([sourceWarehouseId, targetWarehouseId]);
    } catch (error) {
      if (error instanceof Error && error.message === 'WMS_INVENTORY_LOCKED') {
        return NextResponse.json({ success: false, error: 'На одном из складов проводится инвентаризация. Перемещение временно заблокировано.' }, { status: 409 });
      }
      throw error;
    }

    const isAdmin = isWmsAdmin(user);

    // Проверка складов
    const [sourceWh, targetWh] = await Promise.all([
      prisma.warehouse.findUnique({
        where: { id: sourceWarehouseId },
        select: { id: true, name: true, responsibleUserId: true, isActive: true },
      }),
      prisma.warehouse.findUnique({
        where: { id: targetWarehouseId },
        select: { id: true, name: true, responsibleUserId: true, isActive: true },
      }),
    ]);

    if (!sourceWh || !sourceWh.isActive) {
      return NextResponse.json({ success: false, error: 'Склад-отправитель не найден или неактивен' }, { status: 400 });
    }
    if (!targetWh || !targetWh.isActive) {
      return NextResponse.json({ success: false, error: 'Склад-получатель не найден или неактивен' }, { status: 400 });
    }

    // Проверка прав:
    // Если isRequest === true: создатель должен быть МОЛ склада-получателя (или админ)
    // Если isRequest === false (прямая отправка): создатель должен быть МОЛ склада-отправителя (или админ)
    if (!isAdmin) {
      if (isRequest) {
        if (!canManageWarehouse(user, targetWh.responsibleUserId)) {
          return forbiddenResponse(
            `Создать запрос на перевод может только ответственное лицо склада-получателя "${targetWh.name}".`
          );
        }
      } else {
        if (!canManageWarehouse(user, sourceWh.responsibleUserId)) {
          return forbiddenResponse(
            `Выполнить отгрузку может только ответственное лицо склада-отправителя "${sourceWh.name}".`
          );
        }
      }
    }

    // Генерируем уникальный номер перемещения
    const prefix = isRequest ? 'REQ' : 'TR';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const uniqueSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
    const transferNumber = `${prefix}-${dateStr}-${uniqueSuffix}`;

    // Если это прямое перемещение (отгрузка), проверяем остатки и сразу списываем
    if (!isRequest) {
      const result = await prisma.$transaction(async (tx) => {
        await assertNoActiveInventory([sourceWarehouseId, targetWarehouseId], tx);

        // Проверяем наличие всех позиций на складе-отправителе
        for (const item of normalizedItems) {
          const qtyToTransfer = item.quantity as number;
          const stock = await tx.stockItem.findUnique({
            where: {
              warehouseId_nomenclatureId: {
                warehouseId: sourceWarehouseId,
                nomenclatureId: item.nomenclatureId,
              },
            },
            include: { nomenclature: { select: { name: true, unit: true } } },
          });

          const availableQty = stock ? Number(stock.quantity) : 0;
          if (availableQty < qtyToTransfer) {
            const nomName = stock?.nomenclature?.name || 'ТМЦ';
            const nomUnit = stock?.nomenclature?.unit || 'шт';
            throw new Error(
              `Недостаточно остатка для позиции "${nomName}". Доступно: ${availableQty} ${nomUnit}, требуется: ${qtyToTransfer} ${nomUnit}`
            );
          }

          const changed = await tx.stockItem.updateMany({
            where: { id: stock!.id, quantity: { gte: qtyToTransfer } },
            data: {
              quantity: { decrement: qtyToTransfer },
              reservedQuantity: { increment: qtyToTransfer },
            },
          });
          if (changed.count !== 1) {
            throw new Error(`Остаток для "${stock?.nomenclature?.name || 'ТМЦ'}" изменился параллельно`);
          }
        }

        // Создаем запись перемещения со статусом IN_TRANSIT
        const transfer = await tx.stockTransfer.create({
          data: {
            transferNumber,
            sourceWarehouseId,
            targetWarehouseId,
            status: targetWh.responsibleUserId
              ? StockTransferStatus.IN_TRANSIT
              : StockTransferStatus.PENDING_RESPONSIBLE_CONFIRMATION,
            createdById: user.userId,
            requestReason: requestReason?.trim() || null,
            dispatchedAt: new Date(),
            dispatchedById: user.userId,
            items: {
              create: normalizedItems.map((it) => ({
                nomenclatureId: it.nomenclatureId,
                quantity: it.quantity as number,
                targetCellId: it.targetCellId || null,
              })),
            },
          },
          include: {
            sourceWarehouse: true,
            targetWarehouse: true,
            items: { include: { nomenclature: true } },
          },
        });

        await tx.stockReservation.createMany({
          data: normalizedItems.map((item) => ({
            transferId: transfer.id,
            sourceWarehouseId,
            targetWarehouseId,
            nomenclatureId: item.nomenclatureId,
            quantity: item.quantity as number,
            status: StockReservationStatus.ACTIVE,
            requiresResponsibleConfirmation: !targetWh.responsibleUserId,
          })),
        });

        await tx.stockOperation.create({
          data: {
            warehouseId: sourceWarehouseId,
            type: OperationType.ISSUE,
            date: new Date(),
            counterparty: `Склад-получатель: ${targetWh.name}`,
            document: `Перемещение № ${transferNumber}`,
            comment: 'Списание при прямой отгрузке межскладского перемещения',
            createdById: user.userId,
            items: {
              create: normalizedItems.map((item) => ({
                nomenclatureId: item.nomenclatureId,
                quantity: item.quantity as number,
              })),
            },
          },
        });

        return transfer;
      });

      await logAuditEvent({
        userId: user.userId,
        action: 'CREATE',
        entityType: 'StockTransfer',
        entityId: result.id,
        changes: {
          transferNumber,
          type: 'DIRECT_DISPATCH',
          from: sourceWh.name,
          to: targetWh.name,
          itemsCount: items.length,
        },
      }).catch((error) => console.error('Не удалось записать аудит перемещения:', error));

      // Отправляем уведомление МОЛ склада-получателя об отгрузке
      if (targetWh.responsibleUserId && targetWh.responsibleUserId !== user.userId) {
        await prisma.notification.create({
          data: {
            userId: targetWh.responsibleUserId,
            title: 'Отгружено перемещение ТМЦ',
            message: `Со склада «${sourceWh.name}» в ваш адрес отгружено ${items.length} поз. ТМЦ (Перемещение № ${transferNumber}). Ожидается приемка.`,
            type: 'SYSTEM',
            link: '/wms/operations?tab=transfers&mode=inbound',
          },
        }).catch(console.error);
      }

      return NextResponse.json({
        success: true,
        data: result,
        message: `Перемещение ${transferNumber} успешно оформлено. ТМЦ списаны со склада "${sourceWh.name}" и ожидают подтверждения приемки на складе "${targetWh.name}".`,
      });
    } else {
      // Это запрос на перемещение (статус REQUESTED, остатки пока не списываем)
      const transfer = await prisma.stockTransfer.create({
        data: {
          transferNumber,
          sourceWarehouseId,
          targetWarehouseId,
          status: StockTransferStatus.REQUESTED,
          createdById: user.userId,
          requestReason: requestReason?.trim() || null,
          items: {
              create: normalizedItems.map((it) => ({
                nomenclatureId: it.nomenclatureId,
                quantity: it.quantity as number,
              targetCellId: it.targetCellId || null,
            })),
          },
        },
        include: {
          sourceWarehouse: true,
          targetWarehouse: true,
          items: { include: { nomenclature: true } },
        },
      });

      await logAuditEvent({
        userId: user.userId,
        action: 'CREATE',
        entityType: 'StockTransfer',
        entityId: transfer.id,
        changes: {
          transferNumber,
          type: 'TRANSFER_REQUEST',
          from: sourceWh.name,
          to: targetWh.name,
          itemsCount: items.length,
        },
      }).catch((error) => console.error('Не удалось записать аудит заявки:', error));

      // Отправляем уведомление МОЛ склада-донора о новом запросе
      if (sourceWh.responsibleUserId && sourceWh.responsibleUserId !== user.userId) {
        await prisma.notification.create({
          data: {
            userId: sourceWh.responsibleUserId,
            title: 'Новый запрос на перемещение ТМЦ',
            message: `Склад «${targetWh.name}» запросил ${items.length} поз. ТМЦ (Заявка № ${transferNumber}). Требуется согласование отгрузки.`,
            type: 'SYSTEM',
            link: '/wms/operations?tab=transfers&mode=requests',
          },
        }).catch(console.error);
      }

      return NextResponse.json({
        success: true,
        data: transfer,
        message: `Запрос на перемещение ${transferNumber} успешно создан и направлен МОЛ склада-отправителя "${sourceWh.name}".`,
      });
    }
  } catch (error: any) {
    console.error('Ошибка создания перемещения:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка создания перемещения' },
      { status: 400 }
    );
  }
}
