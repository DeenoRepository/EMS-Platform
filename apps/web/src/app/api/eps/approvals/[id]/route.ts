import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, ApprovalStatus, EquipmentStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW) && !hasPermission(user, PERMISSIONS.EPS_APPROVALS_VIEW)) {
      return forbiddenResponse();
    }

    const { id } = params;

    const approval = await prisma.equipmentApproval.findUnique({
      where: { id },
      include: {
        equipment: {
          include: {
            tags: { include: { tag: true } },
            photos: { where: { isPrimary: true }, take: 1 },
          },
        },
        requester: {
          select: { id: true, displayName: true, ldapLogin: true, email: true },
        },
        reviewer: {
          select: { id: true, displayName: true, ldapLogin: true, email: true },
        },
      },
    });

    if (!approval) {
      return NextResponse.json({ success: false, error: 'Заявка на согласование не найдена' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: approval });
  } catch (error: any) {
    console.error('Ошибка получения заявки на согласование:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения заявки на согласование' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = params;
    const body = await req.json();
    const { status, resolutionComment } = body;

    if (!status || !(status in ApprovalStatus)) {
      return NextResponse.json(
        { success: false, error: 'Не указан корректный статус согласования' },
        { status: 400 }
      );
    }

    const approval = await prisma.equipmentApproval.findUnique({
      where: { id },
      include: {
        equipment: true,
      },
    });

    if (!approval) {
      return NextResponse.json({ success: false, error: 'Заявка не найдена' }, { status: 404 });
    }

    if (approval.status !== 'PENDING' && status !== 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Решение по этой заявке уже было принято' },
        { status: 400 }
      );
    }

    // Checking permissions: Requester can CANCEL their own request, review requires management permissions
    if (status === 'CANCELLED') {
      if (approval.requesterId !== user.userId && !hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE)) {
        return forbiddenResponse();
      }
    } else {
      if (!hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE) && !hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_EDIT)) {
        return forbiddenResponse();
      }
    }

    // Execute automatic equipment status update if APPROVED
    if (status === 'APPROVED' && approval.equipment) {
      const prevStatus = approval.equipment.status;
      let newEquipmentStatus: EquipmentStatus | null = null;
      const proposed = (approval.proposedData as any) || {};

      if (approval.type === 'DECOMMISSIONING') {
        newEquipmentStatus = 'DECOMMISSIONED';
      } else if (approval.type === 'COMMISSIONING') {
        newEquipmentStatus = 'ACTIVE';
      } else if (approval.type === 'STATUS_CHANGE' && proposed.targetStatus && proposed.targetStatus in EquipmentStatus) {
        newEquipmentStatus = proposed.targetStatus as EquipmentStatus;
      }

      if (newEquipmentStatus) {
        const updateData: any = { status: newEquipmentStatus };
        if (approval.type === 'COMMISSIONING' && !approval.equipment.commissionDate) {
          updateData.commissionDate = new Date();
        }

        await prisma.equipment.update({
          where: { id: approval.equipmentId },
          data: updateData,
        });

        await logAuditEvent({
          userId: user.userId,
          action: 'UPDATE',
          entityType: 'Equipment',
          entityId: approval.equipmentId,
          changes: {
            status: { old: prevStatus, new: newEquipmentStatus },
            approvalId: approval.id,
            reason: `Автоматическое применение решения согласования: ${approval.title}`,
          },
        });
      }

      // If PARAMETER_CHANGE proposed custom fields
      if (approval.type === 'PARAMETER_CHANGE' && proposed.customFields) {
        const currentCustomFields = (approval.equipment.customFields as any) || {};
        const mergedCustomFields = { ...currentCustomFields, ...proposed.customFields };

        await prisma.equipment.update({
          where: { id: approval.equipmentId },
          data: { customFields: mergedCustomFields },
        });

        await logAuditEvent({
          userId: user.userId,
          action: 'UPDATE',
          entityType: 'Equipment',
          entityId: approval.equipmentId,
          changes: {
            customFields: { old: currentCustomFields, new: mergedCustomFields },
            approvalId: approval.id,
            reason: `Автоматическое применение изменений параметров: ${approval.title}`,
          },
        });
      }
    }

    // Update approval record
    const updatedApproval = await prisma.equipmentApproval.update({
      where: { id },
      data: {
        status: status as ApprovalStatus,
        reviewerId: status === 'CANCELLED' ? approval.reviewerId : user.userId,
        reviewedAt: status === 'CANCELLED' ? approval.reviewedAt : new Date(),
        resolutionComment: resolutionComment?.trim() || null,
      },
      include: {
        equipment: {
          select: { id: true, name: true, inventoryNumber: true, status: true },
        },
        requester: {
          select: { id: true, displayName: true, ldapLogin: true },
        },
        reviewer: {
          select: { id: true, displayName: true, ldapLogin: true },
        },
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'EquipmentApproval',
      entityId: id,
      changes: {
        status: { old: approval.status, new: status },
        resolutionComment,
        equipmentId: approval.equipmentId,
      },
    });

    return NextResponse.json({ success: true, data: updatedApproval });
  } catch (error: any) {
    console.error('Ошибка обработки согласования:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка сохранения решения по согласованию' },
      { status: 500 }
    );
  }
}
