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

    // Execute automatic equipment update if APPROVED
    if (status === 'APPROVED' && approval.equipment) {
      const prevStatus = approval.equipment.status;
      const proposed = (approval.proposedData as any) || {};

      if (approval.type === 'EQUIPMENT_CREATE' || approval.type === 'COMMISSIONING') {
        const targetStatus = (proposed.targetStatus && proposed.targetStatus in EquipmentStatus)
          ? (proposed.targetStatus as EquipmentStatus)
          : 'ACTIVE';

        await prisma.equipment.update({
          where: { id: approval.equipment.id },
          data: {
            status: targetStatus,
            commissionDate: approval.equipment.commissionDate || (proposed.commissionDate ? new Date(proposed.commissionDate) : new Date()),
            name: proposed.name ? proposed.name.trim() : undefined,
            inventoryNumber: proposed.inventoryNumber !== undefined ? (proposed.inventoryNumber?.trim() || null) : undefined,
            serialNumber: proposed.serialNumber !== undefined ? (proposed.serialNumber?.trim() || null) : undefined,
            manufacturer: proposed.manufacturer !== undefined ? (proposed.manufacturer?.trim() || null) : undefined,
            model: proposed.model !== undefined ? (proposed.model?.trim() || null) : undefined,
            location: proposed.location !== undefined ? (proposed.location?.trim() || null) : undefined,
            customFields: proposed.customFields !== undefined ? proposed.customFields : undefined,
          },
        });

        await logAuditEvent({
          userId: user.userId,
          action: 'UPDATE',
          entityType: 'Equipment',
          entityId: approval.equipment.id,
          changes: {
            status: { old: prevStatus, new: targetStatus },
            approvalId: approval.id,
            reason: `Утверждена регистрация оборудования: ${approval.title}`,
          },
        });
      } else if (approval.type === 'EQUIPMENT_UPDATE' || approval.type === 'PARAMETER_CHANGE') {
        const eqId = approval.equipment.id;
        const updatePayload: any = {};
        if (proposed.name) updatePayload.name = proposed.name.trim();
        if (proposed.inventoryNumber !== undefined) updatePayload.inventoryNumber = proposed.inventoryNumber?.trim() || null;
        if (proposed.serialNumber !== undefined) updatePayload.serialNumber = proposed.serialNumber?.trim() || null;
        if (proposed.manufacturer !== undefined) updatePayload.manufacturer = proposed.manufacturer?.trim() || null;
        if (proposed.model !== undefined) updatePayload.model = proposed.model?.trim() || null;
        if (proposed.location !== undefined) updatePayload.location = proposed.location?.trim() || null;
        if (proposed.status && proposed.status in EquipmentStatus) updatePayload.status = proposed.status;
        if (proposed.commissionDate) updatePayload.commissionDate = new Date(proposed.commissionDate);
        if (proposed.customFields) {
          const currentCustomFields = (approval.equipment.customFields as any) || {};
          updatePayload.customFields = { ...currentCustomFields, ...proposed.customFields };
        }

        if (Array.isArray(proposed.tagIds)) {
          await prisma.equipmentTag.deleteMany({ where: { equipmentId: eqId } });
          if (proposed.tagIds.length > 0) {
            await prisma.equipmentTag.createMany({
              data: proposed.tagIds.map((tagId: string) => ({ equipmentId: eqId, tagId })),
            });
          }
        }

        if (Object.keys(updatePayload).length > 0) {
          await prisma.equipment.update({
            where: { id: eqId },
            data: updatePayload,
          });
        }

        await logAuditEvent({
          userId: user.userId,
          action: 'UPDATE',
          entityType: 'Equipment',
          entityId: approval.equipment.id,
          changes: {
            updatedFields: updatePayload,
            approvalId: approval.id,
            reason: `Утверждены изменения паспорта: ${approval.title}`,
          },
        });
      } else if (approval.type === 'DECOMMISSIONING' || approval.type === 'EQUIPMENT_DELETE') {
        await prisma.equipment.update({
          where: { id: approval.equipment.id },
          data: { status: 'DECOMMISSIONED' },
        });

        await logAuditEvent({
          userId: user.userId,
          action: 'UPDATE',
          entityType: 'Equipment',
          entityId: approval.equipment.id,
          changes: {
            status: { old: prevStatus, new: 'DECOMMISSIONED' },
            approvalId: approval.id,
            reason: `Утверждено списание/вывод из эксплуатации: ${approval.title}`,
          },
        });
      } else if (approval.type === 'STATUS_CHANGE' && proposed.targetStatus && proposed.targetStatus in EquipmentStatus) {
        await prisma.equipment.update({
          where: { id: approval.equipment.id },
          data: { status: proposed.targetStatus as EquipmentStatus },
        });

        await logAuditEvent({
          userId: user.userId,
          action: 'UPDATE',
          entityType: 'Equipment',
          entityId: approval.equipment.id,
          changes: {
            status: { old: prevStatus, new: proposed.targetStatus },
            approvalId: approval.id,
            reason: `Утверждена смена рабочего статуса: ${approval.title}`,
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

    // Отправка системного уведомления автору заявки
    try {
      if (approval.requesterId && (status === 'APPROVED' || status === 'REJECTED')) {
        const eqName = approval.equipment?.name || approval.title;
        const isApproved = status === 'APPROVED';

        await prisma.notification.create({
          data: {
            userId: approval.requesterId,
            title: isApproved ? 'Паспорт оборудования согласован' : 'Заявка на согласование отклонена',
            message: isApproved
              ? `Заявка по оборудованию «${eqName}» успешно утверждена и опубликована в реестре.`
              : `Заявка по оборудованию «${eqName}» отклонена. Причина: "${resolutionComment || 'Замечания проверяющего'}".`,
            type: 'EQUIPMENT_CHANGED',
            link: approval.equipmentId ? `/eps/${approval.equipmentId}` : '/eps/approvals',
          },
        });
      }
    } catch (notifErr) {
      console.error('Ошибка отправки уведомления:', notifErr);
    }

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
