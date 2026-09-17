import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, InventoryStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { canManageWarehouse, isWmsAdmin } from '@/lib/wms-access';
import { parseStockQuantity } from '@/lib/wms-validation';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_INVENTORY_MANAGE) && !hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) {
      return forbiddenResponse();
    }

    const { id } = params;
    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: {
        warehouse: {
          include: {
            responsibleUser: {
              select: { id: true, displayName: true, email: true },
            },
          },
        },
        createdBy: {
          select: { id: true, displayName: true, ldapLogin: true },
        },
        items: {
          include: {
            nomenclature: {
              include: {
                category: true,
                stockItems: {
                  include: {
                    cell: {
                      include: { zone: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { nomenclature: { name: 'asc' } },
        },
      },
    });

    if (!inventory) {
      return NextResponse.json({ success: false, error: 'Акт инвентаризации не найден' }, { status: 404 });
    }

    if (!isWmsAdmin(user) && inventory.warehouse.responsibleUserId !== user.userId) {
      return forbiddenResponse('Нет доступа к инвентаризации выбранного склада');
    }

    return NextResponse.json({ success: true, data: inventory });
  } catch (error: any) {
    console.error('Ошибка получения акта инвентаризации:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения данных инвентаризации' }, { status: 500 });
  }
}

interface UpdateItemInput {
  id: string; // InventoryItem ID
  actualQty: number | string | null;
  comment?: string | null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(req, PERMISSIONS.WMS_INVENTORY_MANAGE);
    if (auth.errorResponse) return auth.errorResponse;
    const { user } = auth;

    const { id } = params;
    const currentInventory = await prisma.inventory.findUnique({
      where: { id },
      include: {
        warehouse: true,
        items: {
          include: { nomenclature: true },
        },
      },
    });

    if (!currentInventory) {
      return NextResponse.json({ success: false, error: 'Акт инвентаризации не найден' }, { status: 404 });
    }

    if (!canManageWarehouse(user, currentInventory.warehouse.responsibleUserId)) {
      return forbiddenResponse('Изменять инвентаризацию может только ответственное лицо склада');
    }

    if (currentInventory.status === 'COMPLETED') {
      return NextResponse.json({ success: false, error: 'Данная инвентаризация уже завершена и закрыта для изменений' }, { status: 400 });
    }

    const body = await req.json();
    const { status, comment, items } = body as {
      status?: InventoryStatus;
      comment?: string;
      items?: UpdateItemInput[];
    };

    if (status === 'COMPLETED') {
      if (!Array.isArray(items) || items.length !== currentInventory.items.length) {
        return NextResponse.json({ success: false, error: 'Для завершения необходимо указать фактическое количество всех позиций' }, { status: 400 });
      }
      const itemIds = new Set(items.map((item) => item.id));
      if (itemIds.size !== currentInventory.items.length || currentInventory.items.some((item) => !itemIds.has(item.id))) {
        return NextResponse.json({ success: false, error: 'Набор позиций инвентаризации изменился, обновите акт' }, { status: 409 });
      }
      let discrepanciesCount = 0;

      await prisma.$transaction(async (tx) => {
        const latestStocks = await tx.stockItem.findMany({
          where: {
            warehouseId: currentInventory.warehouseId,
            nomenclatureId: { in: currentInventory.items.map((item) => item.nomenclatureId) },
          },
          select: { quantity: true, updatedAt: true },
        });
        if (latestStocks.some((stock) => stock.updatedAt > currentInventory.createdAt)) {
          throw new Error('INVENTORY_CONFLICT');
        }

        const claimed = await tx.inventory.updateMany({
          where: { id, status: { in: [InventoryStatus.DRAFT, InventoryStatus.IN_PROGRESS] } },
          data: {
            status: InventoryStatus.COMPLETED,
            closedAt: new Date(),
            comment: comment !== undefined ? comment : undefined,
          },
        });
        if (claimed.count !== 1) throw new Error('INVENTORY_CONFLICT');

        // 1. Обновляем строки факта если переданы
        if (Array.isArray(items)) {
          for (const item of items) {
            const existingItem = currentInventory.items.find((i) => i.id === item.id);
            if (existingItem) {
              const actual = parseStockQuantity(item.actualQty);
              if (actual === null) throw new Error('Фактическое количество должно быть конечным неотрицательным числом');
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

        // 2. Перечитываем актуальные позиции инвентаризации в рамках транзакции
        const refreshedItems = await tx.inventoryItem.findMany({
          where: { inventoryId: id },
          include: { nomenclature: true },
        });

        const discrepancyItems = refreshedItems.filter((i) => i.diffQty !== null && Number(i.diffQty) !== 0);
        discrepanciesCount = discrepancyItems.length;

        // Применяем только signed delta относительно snapshot, не затирая более свежий баланс.
        const shortageItems = discrepancyItems
          .filter((item) => Number(item.diffQty) < 0)
          .map((item) => ({ nomenclatureId: item.nomenclatureId, quantity: Math.abs(Number(item.diffQty)) }));
        const surplusItems = discrepancyItems
          .filter((item) => Number(item.diffQty) > 0)
          .map((item) => ({ nomenclatureId: item.nomenclatureId, quantity: Number(item.diffQty) }));

        if (shortageItems.length > 0) {
          await tx.stockOperation.create({
            data: {
              warehouseId: currentInventory.warehouseId,
              type: 'ISSUE_WRITE_OFF',
              document: `Акт инвентаризации № ${id.slice(-6).toUpperCase()}`,
              comment: 'Недостача по результатам инвентаризации',
              createdById: user.userId,
              items: { create: shortageItems },
            },
          });
        }
        if (surplusItems.length > 0) {
          await tx.stockOperation.create({
            data: {
              warehouseId: currentInventory.warehouseId,
              type: 'RECEIPT',
              document: `Акт инвентаризации № ${id.slice(-6).toUpperCase()}`,
              comment: 'Излишек по результатам инвентаризации',
              createdById: user.userId,
              items: { create: surplusItems },
            },
          });
        }

        for (const item of refreshedItems) {
          if (item.actualQty === null) continue;
          const expectedQty = Number(item.expectedQty);
          const actualQty = Number(item.actualQty);
          const deltaQty = actualQty - expectedQty;
          if (deltaQty === 0) continue;

          const changed = await tx.stockItem.updateMany({
            where: {
              warehouseId: currentInventory.warehouseId,
              nomenclatureId: item.nomenclatureId,
              quantity: expectedQty,
            },
            data: { quantity: { increment: deltaQty } },
          });

          if (changed.count === 0 && expectedQty === 0) {
            await tx.stockItem.create({
              data: {
                warehouseId: currentInventory.warehouseId,
                nomenclatureId: item.nomenclatureId,
                quantity: actualQty,
              },
            });
          } else if (changed.count !== 1) {
            throw new Error('INVENTORY_CONFLICT');
          }
        }

      }, { isolationLevel: 'Serializable' });

      await logAuditEvent({
        userId: user.userId,
        action: 'UPDATE',
        entityType: 'Inventory',
        entityId: id,
        changes: {
          status: 'COMPLETED',
          discrepanciesCount,
        },
      }).catch((error) => console.error('Не удалось записать аудит инвентаризации:', error));

      return NextResponse.json({
        success: true,
        message: `Инвентаризация завершена. Скорректировано позиций с расхождениями: ${discrepanciesCount}`,
      });
    }

    // Сохранение черновика / обновления позиций
    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(items)) {
        for (const item of items) {
          const existingItem = currentInventory.items.find((i) => i.id === item.id);
            if (existingItem) {
              const actual = item.actualQty === null ? null : parseStockQuantity(item.actualQty);
              if (item.actualQty !== null && actual === null) throw new Error('Фактическое количество должно быть конечным неотрицательным числом');
              const expected = Number(existingItem.expectedQty);
              const diff = actual === null ? null : actual - expected;

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

      return tx.inventory.update({
        where: { id },
        data: {
          comment: comment !== undefined ? comment : undefined,
          status: status || undefined,
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Ошибка обновления инвентаризации:', error);
    if (error?.message === 'INVENTORY_CONFLICT') {
      return NextResponse.json(
        { success: false, error: 'Операция отклонена: остатки или статус акта изменились. Обновите данные и повторите проверку.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: 'Ошибка обновления инвентаризации' }, { status: 500 });
  }
}
