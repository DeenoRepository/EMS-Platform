import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

// GET /api/wms/warehouses/[id]/zones - List all zones & cells of a warehouse
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'wms-wh-zones-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const zones = await prisma.storageZone.findMany({
      where: { warehouseId: (await params).id },
      include: {
        cells: {
          include: {
            _count: {
              select: { stockItems: true },
            },
          },
          orderBy: { code: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ success: true, data: zones });
  } catch (error) {
    console.error('Error fetching warehouse zones:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/wms/warehouses/[id]/zones - Create a new zone inside a warehouse
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'wms-wh-zones-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const warehouse = await prisma.warehouse.findUnique({ where: { id: (await params).id } });
    if (!warehouse) {
      return NextResponse.json({ success: false, error: 'Склад не найден' }, { status: 404 });
    }

    const isAdmin =
      user.roles.includes('admin') ||
      hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    const isResponsible = Boolean(
      warehouse.responsibleUserId && warehouse.responsibleUserId === user.userId
    );

    const hasZonePermission =
      hasPermission(user, PERMISSIONS.WMS_ZONES_MANAGE) ||
      hasPermission(user, PERMISSIONS.WMS_NOMENCLATURE_MANAGE);

    const canManage = isAdmin || (isResponsible && hasZonePermission);

    if (!canManage) {
      return forbiddenResponse(`Вы не являетесь ответственным лицом за склад "${warehouse.name}". Создание зон разрешено только назначенному МОЛ.`);
    }

    const body = await req.json();
    const { name, code, description } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Укажите название и код зоны' },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();

    // Check if zone code already exists in this warehouse
    const existing = await prisma.storageZone.findUnique({
      where: {
        warehouseId_code: {
          warehouseId: (await params).id,
          code: cleanCode,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Зона с кодом ${cleanCode} уже существует на этом складе` },
        { status: 400 }
      );
    }

    const zone = await prisma.storageZone.create({
      data: {
        warehouseId: (await params).id,
        name: String(name).trim(),
        code: cleanCode,
        description: description ? String(description).trim() : null,
      },
      include: {
        cells: true,
      },
    });

    return NextResponse.json({ success: true, data: zone });
  } catch (error) {
    console.error('Error creating storage zone:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
