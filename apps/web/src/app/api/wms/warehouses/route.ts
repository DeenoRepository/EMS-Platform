import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const forTransfer = searchParams.get('forTransfer') === 'true';

    const isAdmin =
      user.roles.includes('admin') ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    const where: any = {};

    const warehouses = await prisma.warehouse.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        responsibleUser: {
          select: {
            id: true,
            displayName: true,
            ldapLogin: true,
            email: true,
          },
        },
        zones: {
          include: {
            cells: {
              orderBy: { code: 'asc' },
            },
          },
          orderBy: { code: 'asc' },
        },
        _count: {
          select: {
            stockItems: true,
            operations: true,
            inventories: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: warehouses,
    });
  } catch (error: any) {
    console.error('Ошибка получения складов:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения списка складов' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE) && !user.roles.includes('admin')) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { name, code, location, responsibleUserId, isActive } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Наименование склада обязательно' }, { status: 400 });
    }

    const formattedCode = (code || `WH-${Date.now().toString().slice(-4)}`).trim().toUpperCase();

    // Проверка уникальности кода
    const existing = await prisma.warehouse.findUnique({ where: { code: formattedCode } });
    if (existing) {
      return NextResponse.json({ success: false, error: `Склад с кодом "${formattedCode}" уже существует` }, { status: 400 });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name: name.trim(),
        code: formattedCode,
        location: location?.trim() || null,
        responsibleUserId: responsibleUserId?.trim() || null,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
      include: {
        responsibleUser: {
          select: {
            id: true,
            displayName: true,
            ldapLogin: true,
            email: true,
          },
        },
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'Warehouse',
      entityId: warehouse.id,
      changes: { name: warehouse.name, code: warehouse.code, location: warehouse.location },
    });

    return NextResponse.json({ success: true, data: warehouse });
  } catch (error: any) {
    console.error('Ошибка создания склада:', error);
    return NextResponse.json({ success: false, error: 'Ошибка создания склада' }, { status: 500 });
  }
}
