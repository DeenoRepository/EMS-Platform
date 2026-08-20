import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

// GET /api/wms/zones/[id]/cells - List all cells in a zone
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const cells = await prisma.storageCell.findMany({
      where: { zoneId: params.id },
      include: {
        _count: {
          select: { stockItems: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ success: true, data: cells });
  } catch (error) {
    console.error('Error fetching zone cells:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/wms/zones/[id]/cells - Create cell or batch generate cells
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.WMS_ZONES_MANAGE) &&
      !hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE) &&
      !user.roles.includes('admin')
    ) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { code, name, bulkCodes } = body;

    // Check if zone exists with warehouse
    const zone = await prisma.storageZone.findUnique({
      where: { id: params.id },
      include: { warehouse: true },
    });

    if (!zone) {
      return NextResponse.json({ success: false, error: 'Зона не найдена' }, { status: 404 });
    }

    const isAdmin =
      user.roles.includes('admin') ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    if (!isAdmin && zone.warehouse.responsibleUserId && zone.warehouse.responsibleUserId !== user.userId) {
      return forbiddenResponse(`Вы не являетесь ответственным лицом за склад "${zone.warehouse.name}". Создание ячеек запрещено.`);
    }

    // Bulk creation mode
    if (Array.isArray(bulkCodes) && bulkCodes.length > 0) {
      const createdCells = [];
      for (const item of bulkCodes) {
        const itemCode = typeof item === 'string' ? item.trim() : item.code?.trim();
        const itemName = typeof item === 'object' ? item.name?.trim() : undefined;
        if (!itemCode) continue;

        try {
          const cell = await prisma.storageCell.upsert({
            where: {
              zoneId_code: {
                zoneId: params.id,
                code: itemCode,
              },
            },
            create: {
              zoneId: params.id,
              code: itemCode,
              name: itemName || null,
            },
            update: {
              name: itemName !== undefined ? itemName : undefined,
            },
          });
          createdCells.push(cell);
        } catch {
          // ignore duplicates
        }
      }

      return NextResponse.json({
        success: true,
        data: createdCells,
        message: `Создано/обновлено ячеек: ${createdCells.length}`,
      });
    }

    // Single cell creation mode
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Код ячейки обязателен' }, { status: 400 });
    }

    const formattedCode = code.trim();

    const existing = await prisma.storageCell.findUnique({
      where: {
        zoneId_code: {
          zoneId: params.id,
          code: formattedCode,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Ячейка с кодом "${formattedCode}" уже существует в этой зоне` },
        { status: 400 }
      );
    }

    const cell = await prisma.storageCell.create({
      data: {
        zoneId: params.id,
        code: formattedCode,
        name: name ? String(name).trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: cell });
  } catch (error) {
    console.error('Error creating storage cell:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/wms/zones/[id]/cells?cellId=... - Delete a cell
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.WMS_ZONES_MANAGE) &&
      !hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE) &&
      !user.roles.includes('admin')
    ) {
      return forbiddenResponse();
    }

    const zone = await prisma.storageZone.findUnique({
      where: { id: params.id },
      include: { warehouse: true },
    });

    if (!zone) {
      return NextResponse.json({ success: false, error: 'Зона не найдена' }, { status: 404 });
    }

    const isAdmin =
      user.roles.includes('admin') ||
      user.permissions.includes(PERMISSIONS.ADMIN_SETTINGS_MANAGE) ||
      user.permissions.includes(PERMISSIONS.WMS_WAREHOUSES_MANAGE);

    if (!isAdmin && zone.warehouse.responsibleUserId && zone.warehouse.responsibleUserId !== user.userId) {
      return forbiddenResponse(`Вы не являетесь ответственным лицом за склад "${zone.warehouse.name}". Удаление ячейки запрещено.`);
    }

    const { searchParams } = new URL(req.url);
    const cellId = searchParams.get('cellId');

    if (!cellId) {
      return NextResponse.json({ success: false, error: 'cellId is required' }, { status: 400 });
    }

    await prisma.storageCell.delete({
      where: { id: cellId, zoneId: params.id },
    });

    return NextResponse.json({ success: true, message: 'Ячейка успешно удалена' });
  } catch (error) {
    console.error('Error deleting storage cell:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
