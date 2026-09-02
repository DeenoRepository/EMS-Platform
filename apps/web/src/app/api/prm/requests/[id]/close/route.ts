import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, PurchaseRequestStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { buildPrmRequestDeepLink } from '@/lib/prm-navigation';
import {
  canPerformPurchaseRequestClosure,
  isPurchaseAdmin,
  validatePurchaseRequestClosure,
} from '@/lib/prm-requests-service';

export const dynamic = 'force-dynamic';

const requestInclude = {
  targetWarehouse: { select: { id: true, name: true, code: true, responsibleUserId: true } },
  requester: { select: { id: true, displayName: true, ldapLogin: true } },
  closedBy: { select: { id: true, displayName: true, ldapLogin: true } },
  items: true,
} as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, prefix: 'prm-request-close' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, [
    PERMISSIONS.PRM_REQUESTS_MANAGE,
    PERMISSIONS.WMS_OPERATIONS_CREATE,
    PERMISSIONS.ADMIN_SETTINGS_MANAGE,
  ]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { user } = auth;
    const { id } = await params;
    const existing = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: requestInclude,
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Заявка не найдена' }, { status: 404 });
    }

    const isAuthorized = canPerformPurchaseRequestClosure({
      isPurchaseAdmin: isPurchaseAdmin(user),
      isTargetWarehouseResponsible: existing.targetWarehouse.responsibleUserId === user.userId,
    });
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Недостаточно прав для закрытия заявки' }, { status: 403 });
    }

    if (existing.status === PurchaseRequestStatus.CLOSED) {
      return NextResponse.json({ success: false, error: 'Заявка уже закрыта' }, { status: 409 });
    }

    const validation = validatePurchaseRequestClosure({
      status: existing.status,
      items: existing.items,
    });
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const closedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      // Claim the transition in the database, not in the pre-transaction read.
      // Concurrent callers therefore cannot both create downstream effects.
      const claim = await tx.purchaseRequest.updateMany({
        where: { id, status: PurchaseRequestStatus.DELIVERED },
        data: {
          status: PurchaseRequestStatus.CLOSED,
          closedAt,
          closedById: user.userId,
        },
      });

      if (claim.count !== 1) {
        throw new Error('PRM_CLOSE_CONFLICT');
      }

      const updated = await tx.purchaseRequest.findUnique({
        where: { id },
        include: requestInclude,
      });
      if (!updated) {
        throw new Error('PRM_CLOSE_NOT_FOUND');
      }

      const validation = validatePurchaseRequestClosure({
        status: PurchaseRequestStatus.DELIVERED,
        items: updated.items,
      });
      if (!validation.valid) {
        throw new Error(`PRM_CLOSE_VALIDATION_FAILED:${validation.error || 'Нельзя закрыть заявку'}`);
      }

      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: 'UPDATE',
          entityType: 'PurchaseRequest',
          entityId: id,
          changes: {
            status: { old: existing.status, new: PurchaseRequestStatus.CLOSED },
            action: 'CLOSE',
            requestNumber: existing.requestNumber,
            closedAt: { old: null, new: closedAt.toISOString() },
            closedById: { old: null, new: user.userId },
          },
        },
      });

      if (existing.requesterId !== user.userId) {
        await tx.notification.create({
          data: {
            userId: existing.requesterId,
            title: 'Заявка на закупку закрыта',
            message: `Заявка № ${existing.requestNumber} закрыта после полной поставки.`,
            type: 'SYSTEM',
            link: buildPrmRequestDeepLink(id),
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith('PRM_CLOSE_VALIDATION_FAILED:')) {
      return NextResponse.json(
        { success: false, error: error.message.replace('PRM_CLOSE_VALIDATION_FAILED:', '') },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === 'PRM_CLOSE_CONFLICT') {
      return NextResponse.json(
        { success: false, error: 'Заявка уже закрыта или больше не находится в статусе «DELIVERED»' },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === 'PRM_CLOSE_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Заявка не найдена' }, { status: 404 });
    }
    return safeErrorResponse(error, 'Ошибка закрытия заявки', 500, {
      endpoint: 'prm-request-close',
    });
  }
}
