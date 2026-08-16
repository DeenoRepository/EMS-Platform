import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, ApprovalStatus, ApprovalType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW) && !hasPermission(user, PERMISSIONS.EPS_APPROVALS_VIEW)) {
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

    const where: any = {};

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (status && status in ApprovalStatus) {
      where.status = status as ApprovalStatus;
    }

    if (type && type in ApprovalType) {
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

    const [items, total, allApprovals] = await Promise.all([
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
    ]);

    const stats = {
      total: allApprovals.length,
      pending: allApprovals.filter((a) => a.status === 'PENDING').length,
      approved: allApprovals.filter((a) => a.status === 'APPROVED').length,
      rejected: allApprovals.filter((a) => a.status === 'REJECTED').length,
      cancelled: allApprovals.filter((a) => a.status === 'CANCELLED').length,
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
  } catch (error: any) {
    console.error('Ошибка получения списка согласований EPS:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения списка согласований' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_EDIT) && !hasPermission(user, PERMISSIONS.EPS_APPROVALS_CREATE)) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { equipmentId, type, title, description, proposedData } = body;

    if (!equipmentId || !type || !title) {
      return NextResponse.json(
        { success: false, error: 'Необходимо указать оборудование, тип согласования и заголовок' },
        { status: 400 }
      );
    }

    if (!(type in ApprovalType)) {
      return NextResponse.json(
        { success: false, error: 'Недопустимый тип согласования' },
        { status: 400 }
      );
    }

    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment) {
      return NextResponse.json({ success: false, error: 'Оборудование не найдено' }, { status: 404 });
    }

    const approval = await prisma.equipmentApproval.create({
      data: {
        equipmentId,
        type: type as ApprovalType,
        status: 'PENDING',
        title: title.trim(),
        description: description?.trim() || null,
        proposedData: proposedData || null,
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
  } catch (error: any) {
    console.error('Ошибка создания заявки на согласование:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка создания заявки на согласование' },
      { status: 500 }
    );
  }
}
