import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, InventoryStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { WarehouseService } from '@ems/wms';

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

    return NextResponse.json({ success: true, data: inventory });
  } catch (error: any) {
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
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_INVENTORY_MANAGE)) return forbiddenResponse();

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
      const { discrepanciesCount } = await WarehouseService.completeInventory({
        inventoryId: id,
        userId: user.userId,
        comment,
        items,
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
  } catch (error: any) {
    console.error('Ошибка обновления инвентаризации:', error);
    return NextResponse.json({ success: false, error: 'Ошибка обновления инвентаризации' }, { status: 500 });
  }
}
