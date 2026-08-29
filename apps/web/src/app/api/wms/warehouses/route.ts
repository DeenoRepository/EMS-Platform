import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'wms-warehouses-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const forManage = searchParams.get('forManage') === 'true';

    const isAdmin =
      isAdminUser(user) ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    const where: any = {};
    if (forManage && !isAdmin) {
      where.responsibleUserId = user.userId;
    }

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
  } catch (error: unknown) {
    logger.error('Failed to fetch WMS warehouses', {
      endpoint: 'wms-warehouses-get',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Ошибка получения списка складов' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'wms-warehouses-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE) && !isAdminUser(user)) {
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
  } catch (error: unknown) {
    logger.error('Failed to create WMS warehouse', {
      endpoint: 'wms-warehouses-post',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Ошибка создания склада' }, { status: 500 });
  }
}
