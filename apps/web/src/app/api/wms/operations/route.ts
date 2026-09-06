import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, OperationType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { WarehouseService } from '@ems/wms';

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

    const where: any = {};
    if (warehouseId) {
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

    // Выполняем транзакцию изменения остатков через изолированный сервис WMS
    const operation = await WarehouseService.executeOperation({
      warehouseId,
      targetWarehouseId,
      type,
      counterparty,
      recipientName,
      equipmentId,
      document,
      comment,
      items,
      userId: user.userId,
    });

    // 4. Логирование аудита
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
