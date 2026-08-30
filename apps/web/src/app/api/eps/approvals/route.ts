import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, ApprovalStatus, ApprovalType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';
import {
  buildApprovalStats,
  buildApprovalWhereInput,
  parseApprovalListQuery,
} from './get-query';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'eps-approvals-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.EPS_APPROVALS_VIEW) &&
      !hasPermission(user, PERMISSIONS.EPS_APPROVALS_CREATE) &&
      !hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE) &&
      !isAdminUser(user)
    ) {
      return forbiddenResponse();
    }

    const query = parseApprovalListQuery(new URL(req.url).searchParams);
    const { page, pageSize, status, type, equipmentId, search, scope } = query;
    const where = buildApprovalWhereInput(query, user.userId);

    const canReview =
      isAdminUser(user) ||
      hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE);

    const [items, total, allApprovals, userApprovals] = await Promise.all([
      prisma.equipmentApproval.findMany({
        where,
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              inventoryNumber: true,
              manufacturer: true,
              model: true,
              location: true,
              status: true,
            },
          },
          requester: {
            select: {
              id: true,
              displayName: true,
              ldapLogin: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              displayName: true,
              ldapLogin: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.equipmentApproval.count({ where }),
      prisma.equipmentApproval.findMany({
        select: { status: true },
      }),
      prisma.equipmentApproval.findMany({
        where: { requesterId: user.userId },
        select: { status: true },
      }),
    ]);

    const stats = buildApprovalStats(allApprovals, userApprovals, scope, canReview);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        stats,
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка получения списка согласований');
  }
}

const createSchema = z.object({
  equipmentId: z.string().min(1, 'Необходимо указать оборудование'),
  type: z.nativeEnum(ApprovalType, { message: 'Недопустимый тип согласования' }),
  title: z.string().min(1, 'Необходимо указать заголовок'),
  description: z.string().optional(),
  proposedData: z.unknown().optional(),
});

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'eps-approvals-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_EDIT) && !hasPermission(user, PERMISSIONS.EPS_APPROVALS_CREATE)) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { equipmentId, type, title, description, proposedData } = createSchema.parse(body);

    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      return NextResponse.json({ success: false, error: 'Оборудование не найдено' }, { status: 404 });
    }

    const approval = await prisma.equipmentApproval.create({
      data: {
        equipmentId,
        type,
        status: 'PENDING',
        title: title.trim(),
        description: description?.trim() || null,
        proposedData: proposedData ? JSON.parse(JSON.stringify(proposedData)) : null,
        requesterId: user.userId,
      },
      include: {
        equipment: {
          select: { id: true, name: true, inventoryNumber: true, status: true },
        },
        requester: {
          select: { id: true, displayName: true, ldapLogin: true },
        },
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'EquipmentApproval',
      entityId: approval.id,
      changes: {
        equipmentId,
        equipmentName: equipment.name,
        type,
        title,
        status: 'PENDING',
        proposedData,
      },
    });

    return NextResponse.json({ success: true, data: approval });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return safeErrorResponse(error, 'Ошибка создания заявки на согласование');
  }
}
