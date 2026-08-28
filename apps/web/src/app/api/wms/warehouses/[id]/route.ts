import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const { id } = params;
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        responsibleUser: {
          select: {
            id: true,
            displayName: true,
            ldapLogin: true,
            email: true,
          },
        },
        stockItems: {
          include: {
            nomenclature: {
              include: {
                category: true,
              },
            },
          },
          orderBy: { nomenclature: { name: 'asc' } },
        },
        _count: {
          select: {
            operations: true,
            inventories: true,
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json({ success: false, error: 'Склад не найден' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: warehouse });
  } catch (error: unknown) {
    console.error('Ошибка получения данных склада:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения данных склада' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE) && !user.roles.includes('admin')) {
      return forbiddenResponse();
    }

    const { id } = params;
    const current = await prisma.warehouse.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ success: false, error: 'Склад не найден' }, { status: 404 });
    }

    const body = await req.json();
    const { name, code, location, responsibleUserId, isActive } = body;

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        code: code !== undefined ? code.trim().toUpperCase() : undefined,
        location: location !== undefined ? (location?.trim() || null) : undefined,
        responsibleUserId: responsibleUserId !== undefined ? (responsibleUserId ? responsibleUserId.trim() : null) : undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
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
      action: 'UPDATE',
      entityType: 'Warehouse',
      entityId: id,
      changes: body,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Ошибка обновления склада:', error);
    return NextResponse.json({ success: false, error: 'Ошибка обновления склада' }, { status: 500 });
  }
}
