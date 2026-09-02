import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, PurchaseRequestStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';
import {
  calculateEstimatedTotal,
  isPurchaseAdmin,
} from '@/lib/prm-requests-service';

export const dynamic = 'force-dynamic';

// GET /api/prm/requests/[id] - Карточка заявки на закупку ТМЦ
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, prefix: 'prm-request-id-get' });
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

    const { id } = await params;
    const request = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        targetWarehouse: { select: { id: true, name: true, code: true, responsibleUserId: true } },
        requester: { select: { id: true, displayName: true, ldapLogin: true } },
        reviewer: { select: { id: true, displayName: true, ldapLogin: true } },
        equipment: { select: { id: true, name: true, inventoryNumber: true } },
        maintenanceSchedule: { select: { id: true, title: true } },
        items: {
          include: {
            nomenclature: { select: { id: true, name: true, article: true, unit: true } },
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ success: false, error: 'Заявка не найдена' }, { status: 404 });
    }

    const isAdmin = isPurchaseAdmin(user);
    const isOwner = request.requesterId === user.userId;
    const isWarehouseOwner = request.targetWarehouse.responsibleUserId === user.userId;
    if (!isAdmin && !isOwner && !isWarehouseOwner) {
      return forbiddenResponse('У вас нет доступа к этой заявке');
    }

    return NextResponse.json({ success: true, data: request });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка получения заявки на закупку ТМЦ', 500, {
      endpoint: 'prm-request-id-get',
    });
  }
}

const updateItemSchema = z.object({
  nomenclatureId: z.string().min(1, 'Не указана номенклатура'),
  requestedQty: z.number().positive('Количество должно быть больше нуля'),
  estimatedPrice: z.number().nonnegative('Цена не может быть отрицательной'),
  comment: z.string().optional(),
});

const updateSchema = z.object({
  targetWarehouseId: z.string().min(1, 'Не указан склад назначения').optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  justification: z.string().optional(),
  supplierName: z.string().optional(),
  requiredByDate: z.string().optional().nullable(),
  equipmentId: z.string().optional().nullable(),
  maintenanceScheduleId: z.string().optional().nullable(),
  currency: z.string().min(1).optional(),
  items: z.array(updateItemSchema).min(1, 'Добавьте хотя бы одну позицию ТМЦ').optional(),
});

// PATCH /api/prm/requests/[id] - Редактирование черновика заявки
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, prefix: 'prm-request-id-patch' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.PRM_REQUESTS_CREATE)) return forbiddenResponse();

    const { id } = await params;
    const existing = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: { targetWarehouse: { select: { responsibleUserId: true } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Заявка не найдена' }, { status: 404 });
    }

    const isAdmin = isPurchaseAdmin(user);
    if (existing.status !== PurchaseRequestStatus.DRAFT) {
      return NextResponse.json({ success: false, error: 'Редактировать можно только черновик заявки' }, { status: 400 });
    }
    if (!isAdmin && existing.requesterId !== user.userId) {
      return forbiddenResponse('Редактировать заявку может только её инициатор');
    }

    const parsed = updateSchema.parse(await req.json());
    const targetWarehouseId = parsed.targetWarehouseId ?? existing.targetWarehouseId;
    const targetWarehouse = await prisma.warehouse.findUnique({
      where: { id: targetWarehouseId },
      select: { id: true, name: true, isActive: true },
    });
    if (!targetWarehouse || !targetWarehouse.isActive) {
      return NextResponse.json({ success: false, error: 'Склад назначения не найден или неактивен' }, { status: 400 });
    }

    const items = parsed.items;
    const estimatedTotal = items ? calculateEstimatedTotal(items) : undefined;
    const updated = await prisma.$transaction(async (tx) => {
      if (items) {
        await tx.purchaseRequestItem.deleteMany({ where: { requestId: id } });
      }
      return tx.purchaseRequest.update({
        where: { id },
        data: {
          targetWarehouseId,
          priority: parsed.priority,
          justification: parsed.justification === undefined ? undefined : parsed.justification.trim() || null,
          supplierName: parsed.supplierName === undefined ? undefined : parsed.supplierName.trim() || null,
          requiredByDate: parsed.requiredByDate === undefined ? undefined : parsed.requiredByDate ? new Date(parsed.requiredByDate) : null,
          equipmentId: parsed.equipmentId,
          maintenanceScheduleId: parsed.maintenanceScheduleId,
          currency: parsed.currency,
          estimatedTotal,
          ...(items
            ? {
                items: {
                  create: items.map((item) => ({
                    nomenclatureId: item.nomenclatureId,
                    requestedQty: item.requestedQty,
                    estimatedPrice: item.estimatedPrice,
                    comment: item.comment?.trim() || null,
                  })),
                },
              }
            : {}),
        },
        include: { items: true },
      });
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'PurchaseRequest',
      entityId: id,
      changes: { requestNumber: existing.requestNumber, action: 'EDIT_DRAFT', estimatedTotal },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Ошибка валидации', details: error.issues }, { status: 400 });
    }
    return safeErrorResponse(error, 'Ошибка редактирования заявки на закупку ТМЦ', 500, {
      endpoint: 'prm-request-id-patch',
    });
  }
}
