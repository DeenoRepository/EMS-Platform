import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, InventoryStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'wms-inventories-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_INVENTORY_MANAGE) && !hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId')?.trim() || '';
    const status = searchParams.get('status')?.trim() as InventoryStatus | undefined;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
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
  } catch (error: unknown) {
    console.error('Ошибка получения списка инвентаризаций:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения инвентаризаций' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'wms-inventories-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_INVENTORY_MANAGE)) return forbiddenResponse();

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

    if (!warehouse) {
      return NextResponse.json({ success: false, error: 'Склад не найден' }, { status: 404 });
    }

    // Пользователь с правом WMS_INVENTORY_MANAGE может проводить инвентаризацию на любом складе
    const inventory = await prisma.inventory.create({
      data: {
        warehouseId,
        status: InventoryStatus.IN_PROGRESS,
        comment: comment?.trim() || null,
        createdById: user.userId,
        items: {
          create: warehouse.stockItems.map((si) => ({
            nomenclatureId: si.nomenclatureId,
            expectedQty: si.quantity,
            actualQty: si.quantity, // По умолчанию предзаполняем учетным для удобства сверки
            diffQty: 0,
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

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'Inventory',
      entityId: inventory.id,
      changes: { warehouseId, warehouseName: warehouse.name, itemsCount: warehouse.stockItems.length },
    });

    return NextResponse.json({ success: true, data: inventory });
  } catch (error: unknown) {
    console.error('Ошибка создания инвентаризации:', error);
    return NextResponse.json({ success: false, error: 'Ошибка создания акта инвентаризации' }, { status: 500 });
  }
}
