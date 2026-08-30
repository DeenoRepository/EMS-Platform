import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { logger } from '@/lib/logger';
import {
  resolveZoneCellAccess,
  normalizeBulkCellEntry,
  validateSingleCellInput,
} from './cell-generation';

export const dynamic = 'force-dynamic';

// GET /api/wms/zones/[id]/cells - List all cells in a zone
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'wms-zone-cells-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const cells = await prisma.storageCell.findMany({
      where: { zoneId: (await params).id },
      include: {
        _count: {
          select: { stockItems: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ success: true, data: cells });
  } catch (error) {
    logger.error('Failed to fetch zone cells', {
      endpoint: 'wms-zone-cells-get',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/wms/zones/[id]/cells - Create cell or batch generate cells
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'wms-zone-cells-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.WMS_ZONES_MANAGE) &&
      !hasPermission(user, PERMISSIONS.WMS_WAREHOUSES_MANAGE) &&
      !isAdminUser(user)
    ) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { code, name, bulkCodes } = body;
    const zoneId = (await params).id;

    // Check if zone exists with warehouse
    const zone = await prisma.storageZone.findUnique({
      where: { id: zoneId },
      include: { warehouse: true },
    });

    if (!zone) {
      return NextResponse.json({ success: false, error: 'Зона не найдена' }, { status: 404 });
    }

    const access = resolveZoneCellAccess(user, zone, 'create');
    if (!access.allowed) {
      return forbiddenResponse(access.forbiddenMessage);
    }

    // Bulk creation mode
    if (Array.isArray(bulkCodes) && bulkCodes.length > 0) {
      const createdCells = [];
      for (const item of bulkCodes) {
        const normalized = normalizeBulkCellEntry(item);
        if (!normalized) continue;

        try {
          const cell = await prisma.storageCell.upsert({
            where: {
              zoneId_code: {
                zoneId,
                code: normalized.code,
              },
            },
            update: {
              name: normalized.name || undefined,
            },
            create: {
              zoneId,
              code: normalized.code,
              name: normalized.name || undefined,
            },
          });
          createdCells.push(cell);
        } catch (e) {
          logger.warn('Failed to create cell in bulk', {
            endpoint: 'wms-zone-cells-post-bulk',
            cellCode: normalized.code,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: createdCells,
        count: createdCells.length,
      });
    }

    // Single creation mode
    const singleInput = validateSingleCellInput(code, name);
    if (!singleInput) {
      return NextResponse.json({ success: false, error: 'Код ячейки обязателен' }, { status: 400 });
    }

    const existing = await prisma.storageCell.findUnique({
      where: {
        zoneId_code: {
          zoneId,
          code: singleInput.cleanCode,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Ячейка с кодом ${singleInput.cleanCode} уже существует в этой зоне` },
        { status: 400 }
      );
    }

    const cell = await prisma.storageCell.create({
      data: {
        zoneId,
        code: singleInput.cleanCode,
        name: singleInput.cleanName,
      },
    });

    return NextResponse.json({ success: true, data: cell });
  } catch (error) {
    logger.error('Failed to create storage cell', {
      endpoint: 'wms-zone-cells-post',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/wms/zones/[id]/cells?cellId=... - Delete a cell from zone
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'wms-zone-cells-delete' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const zoneId = (await params).id;

    const zone = await prisma.storageZone.findUnique({
      where: { id: zoneId },
      include: { warehouse: true },
    });

    if (!zone) {
      return NextResponse.json({ success: false, error: 'Зона не найдена' }, { status: 404 });
    }

    const access = resolveZoneCellAccess(user, zone, 'delete');
    if (!access.allowed) {
      return forbiddenResponse(access.forbiddenMessage);
    }

    const { searchParams } = new URL(req.url);
    const cellId = searchParams.get('cellId');

    if (!cellId) {
      return NextResponse.json({ success: false, error: 'cellId is required' }, { status: 400 });
    }

    await prisma.storageCell.delete({
      where: { id: cellId, zoneId },
    });

    return NextResponse.json({ success: true, message: 'Ячейка успешно удалена' });
  } catch (error) {
    logger.error('Failed to delete storage cell', {
      endpoint: 'wms-zone-cells-delete',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
