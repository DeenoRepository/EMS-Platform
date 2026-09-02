import { NextResponse } from 'next/server';
import { prisma, PurchaseRequestStatus, NotificationType } from '@ems/database';
import { JwtUserPayload } from '@ems/shared';
import { logAuditEvent } from '@ems/auth';
import { logger } from '@/lib/logger';
import {
  buildStatusTransitionUpdate,
  canPerformTransition,
  isPurchaseAdmin,
  isValidStatusTransition,
} from '@/lib/prm-requests-service';

const requestInclude = {
  targetWarehouse: { select: { id: true, name: true, code: true, responsibleUserId: true } },
  requester: { select: { id: true, displayName: true, ldapLogin: true } },
  reviewer: { select: { id: true, displayName: true, ldapLogin: true } },
  items: {
    include: {
      nomenclature: { select: { id: true, name: true, article: true, unit: true } },
    },
  },
} as const;

const NOTIFICATION_BY_STATUS: Partial<Record<PurchaseRequestStatus, NotificationType>> = {
  SUBMITTED: 'PURCHASE_REQUEST_SUBMITTED',
  APPROVED: 'PURCHASE_REQUEST_APPROVED',
  REJECTED: 'PURCHASE_REQUEST_REJECTED',
};

interface TransitionParams {
  id: string;
  user: JwtUserPayload;
  targetStatus: PurchaseRequestStatus;
  resolutionComment?: string;
  auditActionLabel: string;
}

/**
 * Shared execution path for submit/approve/reject/cancel routes: fetch,
 * validate the status transition (pure function), enforce who may perform
 * it, persist, audit, and best-effort notify. Kept out of individual route
 * files so the five write-route axes (success/validation/401/403/500) are
 * exercised identically across all four actions.
 */
export async function executeStatusTransition(params: TransitionParams): Promise<NextResponse> {
  const { id, user, targetStatus, resolutionComment, auditActionLabel } = params;

  const existing = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: { targetWarehouse: { select: { responsibleUserId: true } } },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: 'Заявка не найдена' }, { status: 404 });
  }

  if (!isValidStatusTransition(existing.status, targetStatus)) {
    return NextResponse.json(
      {
        success: false,
        error: `Переход из статуса "${existing.status}" в "${targetStatus}" недопустим`,
      },
      { status: 400 },
    );
  }

  const isAdmin = isPurchaseAdmin(user);
  const isRequester = existing.requesterId === user.userId;
  if (!canPerformTransition({ to: targetStatus, isRequester, isAdmin })) {
    return NextResponse.json(
      { success: false, error: 'Недостаточно прав для выполнения этого действия' },
      { status: 403 },
    );
  }

  if (targetStatus === PurchaseRequestStatus.REJECTED && !resolutionComment?.trim()) {
    return NextResponse.json(
      { success: false, error: 'Для отклонения заявки обязательно укажите причину' },
      { status: 400 },
    );
  }

  const updated = await prisma.purchaseRequest.update({
    where: { id },
    data: buildStatusTransitionUpdate({ targetStatus, actorId: user.userId, resolutionComment }),
    include: requestInclude,
  });

  await logAuditEvent({
    userId: user.userId,
    action: 'UPDATE',
    entityType: 'PurchaseRequest',
    entityId: id,
    changes: {
      status: { old: existing.status, new: targetStatus },
      action: auditActionLabel,
      requestNumber: updated.requestNumber,
      resolutionComment,
    },
  });

  const notificationType = NOTIFICATION_BY_STATUS[targetStatus];
  const notifyUserId =
    targetStatus === PurchaseRequestStatus.SUBMITTED
      ? existing.targetWarehouse.responsibleUserId
      : updated.requesterId;

  if (notificationType && notifyUserId && notifyUserId !== user.userId) {
    await prisma.notification
      .create({
        data: {
          userId: notifyUserId,
          title:
            targetStatus === PurchaseRequestStatus.SUBMITTED
              ? 'Новая заявка на закупку ТМЦ'
              : targetStatus === PurchaseRequestStatus.APPROVED
                ? 'Заявка на закупку согласована'
                : 'Заявка на закупку отклонена',
          message: `Заявка № ${updated.requestNumber} ${
            targetStatus === PurchaseRequestStatus.SUBMITTED
              ? 'подана на рассмотрение.'
              : targetStatus === PurchaseRequestStatus.APPROVED
                ? 'согласована.'
                : `отклонена. Причина: "${resolutionComment || 'не указана'}".`
          }`,
          type: notificationType,
          link: `/prm/${id}`,
        },
      })
      .catch((error: unknown) => {
        logger.warn('Не удалось отправить уведомление по заявке PRM', {
          requestId: id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }

  return NextResponse.json({ success: true, data: updated });
}
