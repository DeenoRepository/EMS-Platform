import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { isPurchaseAdmin, resolveUserWarehouseIds, buildPurchaseRequestWhereInput } from '@/lib/prm-requests-service';
import { parsePurchaseRequestListQuery } from '../get-query';
import { buildPurchaseRequestCsv } from '@/lib/prm-export';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 10, prefix: 'prm-requests-export' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.PRM_REQUESTS_VIEW) && !hasPermission(user, PERMISSIONS.PRM_REQUESTS_MANAGE)) {
      return forbiddenResponse();
    }

    const query = parsePurchaseRequestListQuery(new URL(req.url).searchParams);
    const isAdmin = isPurchaseAdmin(user);
    const userWarehouseIds = await resolveUserWarehouseIds({ isAdmin, userId: user.userId });
    const where = buildPurchaseRequestWhereInput({
      scope: query.scope,
      status: query.status,
      warehouseId: query.warehouseId,
      search: query.search,
      userId: user.userId,
      isAdmin,
      userWarehouseIds,
    });

    const requests = await prisma.purchaseRequest.findMany({
      where,
      include: {
        targetWarehouse: { select: { name: true } },
        requester: { select: { displayName: true } },
        items: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const csv = buildPurchaseRequestCsv(requests.map((request) => ({
      requestNumber: request.requestNumber,
      status: request.status,
      priority: request.priority,
      warehouse: request.targetWarehouse.name,
      requester: request.requester.displayName,
      supplierName: request.supplierName,
      estimatedTotal: Number(request.estimatedTotal),
      currency: request.currency,
      createdAt: request.createdAt,
      itemsCount: request.items.length,
    })));

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="purchase-requests.csv"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Ошибка экспорта реестра заявок' }, { status: 500 });
  }
}
