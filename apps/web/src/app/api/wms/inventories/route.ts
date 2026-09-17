import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, InventoryStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { canManageWarehouse, isWmsAdmin } from '@/lib/wms-access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_INVENTORY_MANAGE) && !hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId')?.trim() || '';
    const status = searchParams.get('status')?.trim() as InventoryStatus | undefined;

    const admin = isWmsAdmin(user);
    const where: any = {};
    if (warehouseId) {
      if (!admin) {
        const assignedWarehouse = await prisma.warehouse.findFirst({
          where: { id: warehouseId, responsibleUserId: user.userId, isActive: true, deletedAt: null },
          select: { id: true },
        });
        if (!assignedWarehouse) return forbiddenResponse('Нет доступа к выбранному складу');
      }
      where.warehouseId = warehouseId;
    } else if (!admin) {
      const assignedWarehouses = await prisma.warehouse.findMany({
        where: { responsibleUserId: user.userId, isActive: true, deletedAt: null },
        select: { id: true },
      });
      where.warehouseId = { in: assignedWarehouses.map((warehouse) => warehouse.id) };
    }
    if (status && status in InventoryStatus) where.status = status;

    const inventories = await prisma.inventory.findMany({
      where,
      include: {
        warehouse: true,
        createdBy: {
          select: { id: true, displayName: true, ldapLogin: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: inventories });
  } catch (error: any) {
    console.error('Ошибка получения списка инвентаризаций:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения инвентаризаций' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, PERMISSIONS.WMS_INVENTORY_MANAGE);
    if (auth.errorResponse) return auth.errorResponse;
    const { user } = auth;

    const body = await req.json();
    const { warehouseId, comment } = body;

    if (!warehouseId) {
      return NextResponse.json({ success: false, error: 'Выберите склад для инвентаризации' }, { status: 400 });
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      include: {
        stockItems: true,
      },
    });

    if (!warehouse || !warehouse.isActive || warehouse.deletedAt) {
      return NextResponse.json({ success: false, error: 'Склад не найден' }, { status: 404 });
    }

    if (!canManageWarehouse(user, warehouse.responsibleUserId)) {
      return forbiddenResponse('Инвентаризация разрешена только ответственному лицу склада');
    }

    const activeInventory = await prisma.inventory.findFirst({
      where: {
        warehouseId,
        status: { in: [InventoryStatus.DRAFT, InventoryStatus.IN_PROGRESS] },
      },
      select: { id: true },
    });
    if (activeInventory) {
      return NextResponse.json(
        { success: false, error: 'Для этого склада уже существует незавершенная инвентаризация' },
        { status: 409 }
      );
    }

    // Пользователь с правом WMS_INVENTORY_MANAGE может проводить инвентаризацию на любом складе
    const inventory = await prisma.$transaction(async (tx) => {
      const activeInventory = await tx.inventory.findFirst({
        where: {
          warehouseId,
          status: { in: [InventoryStatus.DRAFT, InventoryStatus.IN_PROGRESS] },
        },
        select: { id: true },
      });
      if (activeInventory) {
        throw new Error('ACTIVE_INVENTORY_EXISTS');
      }

      return tx.inventory.create({
        data: {
          warehouseId,
          status: InventoryStatus.IN_PROGRESS,
          comment: comment?.trim() || null,
          createdById: user.userId,
          items: {
            create: warehouse.stockItems.map((si) => ({
              nomenclatureId: si.nomenclatureId,
              expectedQty: si.quantity,
              actualQty: null,
              diffQty: null,
            })),
          },
        },
        include: {
          warehouse: true,
          items: {
            include: { nomenclature: true },
          },
        },
      });
    }, { isolationLevel: 'Serializable' });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'Inventory',
      entityId: inventory.id,
      changes: { warehouseId, warehouseName: warehouse.name, itemsCount: warehouse.stockItems.length },
    });

    return NextResponse.json({ success: true, data: inventory });
  } catch (error: any) {
    console.error('Ошибка создания инвентаризации:', error);
    if (error?.message === 'ACTIVE_INVENTORY_EXISTS') {
      return NextResponse.json(
        { success: false, error: 'Для этого склада уже существует незавершенная инвентаризация' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: 'Ошибка создания акта инвентаризации' }, { status: 500 });
  }
}
