import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, InventoryStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'wms-inventory-id-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_INVENTORY_MANAGE) && !hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) {
      return forbiddenResponse();
    }

    const { id } = await params;
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

    return NextResponse.json({ success: true, data: inventory });
  } catch (error: unknown) {
    console.error('Ошибка получения акта инвентаризации:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения данных инвентаризации' }, { status: 500 });
  }
}

interface UpdateItemInput {
  id: string; // InventoryItem ID
  actualQty: number;
  comment?: string | null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'wms-inventory-id-patch' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_INVENTORY_MANAGE)) return forbiddenResponse();

    const { id } = await params;
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
      let discrepanciesCount = 0;

      await prisma.$transaction(async (tx) => {
        // 1. Обновляем строки факта если переданы
        if (Array.isArray(items)) {
          for (const item of items) {
            const existingItem = currentInventory.items.find((i) => i.id === item.id);
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

        // 2. Перечитываем актуальные позиции инвентаризации в рамках транзакции
        const refreshedItems = await tx.inventoryItem.findMany({
          where: { inventoryId: id },
          include: { nomenclature: true },
        });

        const discrepancyItems = refreshedItems.filter((i) => i.diffQty !== null && Number(i.diffQty) !== 0);
        discrepanciesCount = discrepancyItems.length;

        // Если есть расхождения — создаем операцию корректировки
        if (discrepancyItems.length > 0) {
          await tx.stockOperation.create({
            data: {
              warehouseId: currentInventory.warehouseId,
              type: 'ADJUSTMENT',
              document: `Акт инвентаризации № ${id.slice(-6).toUpperCase()}`,
              comment: `Автоматическая корректировка по результатам инвентаризации`,
              createdById: user.userId,
              items: {
                create: discrepancyItems.map((item) => ({
                  nomenclatureId: item.nomenclatureId,
                  quantity: Math.abs(Number(item.diffQty)),
                })),
              },
            },
          });

          // Обновляем остатки до фактических значений
          for (const item of refreshedItems) {
            if (item.actualQty !== null) {
              await tx.stockItem.upsert({
                where: {
                  warehouseId_nomenclatureId: {
                    warehouseId: currentInventory.warehouseId,
                    nomenclatureId: item.nomenclatureId,
                  },
                },
                update: {
                  quantity: item.actualQty,
                },
                create: {
                  warehouseId: currentInventory.warehouseId,
                  nomenclatureId: item.nomenclatureId,
                  quantity: item.actualQty,
                },
              });
            }
          }
        }

        // Закрываем акт инвентаризации
        await tx.inventory.update({
          where: { id },
          data: {
            status: InventoryStatus.COMPLETED,
            closedAt: new Date(),
            comment: comment !== undefined ? comment : undefined,
          },
        });
      });

      await logAuditEvent({
        userId: user.userId,
        action: 'UPDATE',
        entityType: 'Inventory',
        entityId: id,
        changes: {
          status: 'COMPLETED',
          discrepanciesCount,
        },
      });

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

      return tx.inventory.update({
        where: { id },
        data: {
          comment: comment !== undefined ? comment : undefined,
          status: status || undefined,
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Ошибка обновления инвентаризации:', error);
    return NextResponse.json({ success: false, error: 'Ошибка обновления инвентаризации' }, { status: 500 });
  }
}
