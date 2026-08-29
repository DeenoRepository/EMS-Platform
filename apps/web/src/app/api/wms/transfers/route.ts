import { NextRequest, NextResponse } from 'next/server';
import { safeErrorResponse } from '@/lib/safe-error';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, StockTransferStatus, OperationType, Prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { logger } from '@/lib/logger';
import {
  generateTransferNumber,
  buildTransferWhereInput,
  getTransferTabCounts,
} from '@/lib/wms-transfers-service';

export const dynamic = 'force-dynamic';

// GET /api/wms/transfers - Список перемещений и заявок
export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'wms-transfers-get' });
  if (rateLimitError) return rateLimitError;

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

    const isAdmin =
      isAdminUser(user) ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    // Находим склады пользователя, если он не админ
    let userWarehouseIds: string[] = [];
    if (warehouseId) {
      userWarehouseIds = [warehouseId];
    } else if (!isAdmin) {
      const userWhs = await prisma.warehouse.findMany({
        where: { responsibleUserId: user.userId },
        select: { id: true },
      });
      userWarehouseIds = userWhs.map((w) => w.id);
    }

    const where = buildTransferWhereInput({
      mode,
      status,
      warehouseId,
      search,
      userId: user.userId,
    });

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

    const counts = await getTransferTabCounts({
      isAdmin,
      warehouseId,
      userWarehouseIds,
      total,
    });

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
  } catch (error: unknown) {
    logger.error('Failed to fetch transfers list', {
      endpoint: 'wms-transfers-get',
      error: error instanceof Error ? error.message : String(error),
    });
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
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'wms-transfers-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_OPERATIONS_CREATE)) return forbiddenResponse();

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

    for (const it of items) {
      const q = Number(it.quantity);
      if (isNaN(q) || q <= 0) {
        return NextResponse.json(
          { success: false, error: 'Количество каждой позиции должно быть больше нуля' },
          { status: 400 }
        );
      }
    }

    const isAdmin =
      isAdminUser(user) ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

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
        if (targetWh.responsibleUserId && targetWh.responsibleUserId !== user.userId) {
          return forbiddenResponse(
            `Создать запрос на перевод может только ответственное лицо склада-получателя "${targetWh.name}".`
          );
        }
      } else {
        if (sourceWh.responsibleUserId && sourceWh.responsibleUserId !== user.userId) {
          return forbiddenResponse(
            `Выполнить отгрузку может только ответственное лицо склада-отправителя "${sourceWh.name}".`
          );
        }
      }
    }

    // Генерируем уникальный номер перемещения
    const transferNumber = generateTransferNumber(isRequest);

    // Если это прямое перемещение (отгрузка), проверяем остатки и сразу списываем
    if (!isRequest) {
      const result = await prisma.$transaction(async (tx) => {
        // Проверяем наличие всех позиций на складе-отправителе
        for (const item of items) {
          const qtyToTransfer = Number(item.quantity);
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

          // Списываем ТМЦ со склада-отправителя
          const newQty = availableQty - qtyToTransfer;
          await tx.stockItem.update({
            where: { id: stock!.id },
            data: { quantity: newQty },
          });
        }

        // Создаем запись перемещения со статусом IN_TRANSIT
        const transfer = await tx.stockTransfer.create({
          data: {
            transferNumber,
            sourceWarehouseId,
            targetWarehouseId,
            status: StockTransferStatus.IN_TRANSIT,
            createdById: user.userId,
            requestReason: requestReason?.trim() || null,
            dispatchedAt: new Date(),
            dispatchedById: user.userId,
            items: {
              create: items.map((it) => ({
                nomenclatureId: it.nomenclatureId,
                quantity: it.quantity,
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
      });

      // Best-effort уведомление: ошибка не отменяет успешно созданное перемещение.
      if (targetWh.responsibleUserId && targetWh.responsibleUserId !== user.userId) {
        await prisma.notification.create({
          data: {
            userId: targetWh.responsibleUserId,
            title: 'Отгружено перемещение ТМЦ',
            message: `Со склада «${sourceWh.name}» в ваш адрес отгружено ${items.length} поз. ТМЦ (Перемещение № ${transferNumber}). Ожидается приемка.`,
            type: 'SYSTEM',
            link: '/wms/transfers?mode=inbound',
          },
        }).catch((error: unknown) => {
          logger.warn('Не удалось отправить уведомление об отгрузке перемещения', {
            transferId: result.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
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
            create: items.map((it) => ({
              nomenclatureId: it.nomenclatureId,
              quantity: it.quantity,
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
      });

      // Best-effort уведомление: ошибка не отменяет успешно созданный запрос.
      if (sourceWh.responsibleUserId && sourceWh.responsibleUserId !== user.userId) {
        await prisma.notification.create({
          data: {
            userId: sourceWh.responsibleUserId,
            title: 'Новый запрос на перемещение ТМЦ',
            message: `Склад «${targetWh.name}» запросил ${items.length} поз. ТМЦ (Заявка № ${transferNumber}). Требуется согласование отгрузки.`,
            type: 'SYSTEM',
            link: '/wms/transfers?mode=requests',
          },
        }).catch((error: unknown) => {
          logger.warn('Не удалось отправить уведомление о запросе перемещения', {
            transferId: transfer.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }

      return NextResponse.json({
        success: true,
        data: transfer,
        message: `Запрос на перемещение ${transferNumber} успешно создан и направлен МОЛ склада-отправителя "${sourceWh.name}".`,
      });
    }
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка создания перемещения', 500, { endpoint: 'wms-transfers-create' });
  }
}
