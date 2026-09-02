import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { isPurchaseAdmin, resolveUserWarehouseIds } from '@/lib/prm-requests-service';
import { calculateShortageSuggestions } from '@/lib/prm-shortage-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, prefix: 'prm-shortages-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.PRM_REQUESTS_VIEW) &&
      !hasPermission(user, PERMISSIONS.PRM_REQUESTS_CREATE) &&
      !hasPermission(user, PERMISSIONS.PRM_REQUESTS_MANAGE)
    ) {
      return forbiddenResponse();
    }

    const warehouseId = new URL(req.url).searchParams.get('warehouseId')?.trim() || null;
    const isAdmin = isPurchaseAdmin(user);
    const userWarehouseIds = await resolveUserWarehouseIds({ isAdmin, userId: user.userId });
    const scopedWarehouseIds = warehouseId
      ? isAdmin || userWarehouseIds.includes(warehouseId) ? [warehouseId] : []
      : isAdmin ? undefined : userWarehouseIds;

    const rows = await prisma.stockItem.findMany({
      where: {
        ...(scopedWarehouseIds ? { warehouseId: { in: scopedWarehouseIds } } : {}),
        nomenclature: { deletedAt: null, minStock: { not: null } },
      },
      include: {
        nomenclature: {
          select: { id: true, name: true, article: true, unit: true, minStock: true, deletedAt: true },
        },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { nomenclature: { name: 'asc' } }],
    });

    return NextResponse.json({
      success: true,
      data: calculateShortageSuggestions(rows),
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка расчёта дефицита ТМЦ', 500, {
      endpoint: 'prm-shortages-get',
    });
  }
}
