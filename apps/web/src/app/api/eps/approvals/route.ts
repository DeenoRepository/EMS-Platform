import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, ApprovalStatus, ApprovalType, Prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.EPS_APPROVALS_VIEW) &&
      !hasPermission(user, PERMISSIONS.EPS_APPROVALS_CREATE) &&
      !hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE) &&
      !user.roles.includes('admin')
    ) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25', 10)));
    const status = searchParams.get('status')?.trim() || '';
    const type = searchParams.get('type')?.trim() || '';
    const equipmentId = searchParams.get('equipmentId')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';
    const scope = searchParams.get('scope')?.trim() || 'all'; // all | my_requests | to_review

    const where: Prisma.EquipmentApprovalWhereInput = {};

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (status && Object.keys(ApprovalStatus).includes(status)) {
      where.status = status as ApprovalStatus;
    }

    if (type && Object.keys(ApprovalType).includes(type)) {
      where.type = type as ApprovalType;
    }

    if (scope === 'my_requests') {
      where.requesterId = user.userId;
    } else if (scope === 'to_review') {
      where.status = 'PENDING';
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          equipment: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { inventoryNumber: { contains: search, mode: 'insensitive' } },
              { serialNumber: { contains: search, mode: 'insensitive' } },
              { manufacturer: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const canReview =
      user.roles.includes('admin') ||
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

    const toReviewCount = canReview ? allApprovals.filter((a) => a.status === 'PENDING').length : 0;
    const myRejectedCount = userApprovals.filter((a) => a.status === 'REJECTED').length;
    const myPendingCount = userApprovals.filter((a) => a.status === 'PENDING').length;

    const targetApprovals =
      scope === 'my_requests'
        ? userApprovals
        : scope === 'to_review'
        ? allApprovals.filter((a) => a.status === 'PENDING')
        : allApprovals;

    const stats = {
      total: targetApprovals.length,
      pending: targetApprovals.filter((a) => a.status === 'PENDING').length,
      approved: targetApprovals.filter((a) => a.status === 'APPROVED').length,
      rejected: targetApprovals.filter((a) => a.status === 'REJECTED').length,
      cancelled: targetApprovals.filter((a) => a.status === 'CANCELLED').length,
      // User-scoped and review stats
      toReview: toReviewCount,
      myRejected: myRejectedCount,
      myPending: myPendingCount,
      actionableCount: toReviewCount + myRejectedCount,
    };

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
    console.error('Ошибка получения списка согласований EPS:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка получения списка согласований', details: message },
      { status: 500 }
    );
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
    console.error('Ошибка создания заявки на согласование:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка создания заявки на согласование', details: message },
      { status: 500 }
    );
  }
}
