import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, ApprovalStatus, EquipmentStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.EPS_APPROVALS_VIEW) &&
      !hasPermission(user, PERMISSIONS.EPS_APPROVALS_CREATE) &&
      !hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE) &&
      !user.roles.includes('admin')
    ) return forbiddenResponse();

    const approval = await prisma.equipmentApproval.findUnique({
      where: { id: params.id },
      include: {
        equipment: {
          include: {
            tags: { include: { tag: true } },
            photos: { where: { isPrimary: true }, take: 1 },
          },
        },
        requester: { select: { id: true, displayName: true, ldapLogin: true, email: true } },
        reviewer: { select: { id: true, displayName: true, ldapLogin: true, email: true } },
      },
    });

    if (!approval) return NextResponse.json({ success: false, error: 'Заявка на согласование не найдена' }, { status: 404 });
    return NextResponse.json({ success: true, data: approval });
  } catch (error: unknown) {
    console.error('Ошибка получения заявки на согласование:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Ошибка получения заявки на согласование', details: message }, { status: 500 });
  }
}

const updateSchema = z.object({
  status: z.nativeEnum(ApprovalStatus, { message: 'Не указан корректный статус согласования' }),
  resolutionComment: z.string().optional(),
});

type EquipmentAudit = { entityId: string; changes: Record<string, unknown> };

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { status, resolutionComment } = updateSchema.parse(await req.json());
    const canManage = hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE);

    if (status === 'CANCELLED' && !canManage) {
      const approval = await prisma.equipmentApproval.findUnique({ where: { id: params.id }, select: { requesterId: true } });
      if (!approval) return NextResponse.json({ success: false, error: 'Заявка не найдена' }, { status: 404 });
      if (approval.requesterId !== user.userId) return forbiddenResponse();
    } else if (status !== 'CANCELLED' && !canManage) {
      return forbiddenResponse();
    }

    const result = await prisma.$transaction(async (tx) => {
      const approval = await tx.equipmentApproval.findUnique({ where: { id: params.id }, include: { equipment: true } });
      if (!approval) throw new Error('APPROVAL_NOT_FOUND');
      if (approval.status !== 'PENDING') throw new Error('APPROVAL_NOT_PENDING');
      if (status !== 'CANCELLED' && approval.requesterId === user.userId) throw new Error('APPROVAL_SELF_DECISION');
      if (status === 'CANCELLED' && !canManage && approval.requesterId !== user.userId) throw new Error('APPROVAL_FORBIDDEN');

      let equipmentAudit: EquipmentAudit | undefined;
      if (status === 'APPROVED' && approval.equipment) {
        const equipment = approval.equipment;
        const proposed = (approval.proposedData as Record<string, any>) || {};
        const prevStatus = equipment.status;

        if (approval.type === 'EQUIPMENT_CREATE' || approval.type === 'COMMISSIONING') {
          const targetStatus = proposed.targetStatus && proposed.targetStatus in EquipmentStatus
            ? proposed.targetStatus as EquipmentStatus
            : 'ACTIVE';
          await tx.equipment.update({
            where: { id: equipment.id },
            data: {
              status: targetStatus,
              commissionDate: equipment.commissionDate || (proposed.commissionDate ? new Date(proposed.commissionDate) : new Date()),
              name: proposed.name ? proposed.name.trim() : undefined,
              inventoryNumber: proposed.inventoryNumber !== undefined ? proposed.inventoryNumber?.trim() || null : undefined,
              serialNumber: proposed.serialNumber !== undefined ? proposed.serialNumber?.trim() || null : undefined,
              manufacturer: proposed.manufacturer !== undefined ? proposed.manufacturer?.trim() || null : undefined,
              model: proposed.model !== undefined ? proposed.model?.trim() || null : undefined,
              location: proposed.location !== undefined ? proposed.location?.trim() || null : undefined,
              customFields: proposed.customFields !== undefined ? proposed.customFields : undefined,
            },
          });
          equipmentAudit = { entityId: equipment.id, changes: { status: { old: prevStatus, new: targetStatus }, approvalId: approval.id, reason: `Утверждена регистрация оборудования: ${approval.title}` } };
        } else if (approval.type === 'EQUIPMENT_UPDATE' || approval.type === 'PARAMETER_CHANGE') {
          const updatePayload: Record<string, any> = {};
          if (proposed.name) updatePayload.name = proposed.name.trim();
          if (proposed.inventoryNumber !== undefined) updatePayload.inventoryNumber = proposed.inventoryNumber?.trim() || null;
          if (proposed.serialNumber !== undefined) updatePayload.serialNumber = proposed.serialNumber?.trim() || null;
          if (proposed.manufacturer !== undefined) updatePayload.manufacturer = proposed.manufacturer?.trim() || null;
          if (proposed.model !== undefined) updatePayload.model = proposed.model?.trim() || null;
          if (proposed.location !== undefined) updatePayload.location = proposed.location?.trim() || null;
          if (proposed.status && proposed.status in EquipmentStatus) updatePayload.status = proposed.status;
          if (proposed.commissionDate) updatePayload.commissionDate = new Date(proposed.commissionDate);
          if (proposed.customFields) updatePayload.customFields = { ...((equipment.customFields as Record<string, any>) || {}), ...proposed.customFields };

          if (Array.isArray(proposed.tagIds)) {
            await tx.equipmentTag.deleteMany({ where: { equipmentId: equipment.id } });
            if (proposed.tagIds.length > 0) await tx.equipmentTag.createMany({ data: proposed.tagIds.map((tagId: string) => ({ equipmentId: equipment.id, tagId })) });
          }
          if (Object.keys(updatePayload).length > 0) await tx.equipment.update({ where: { id: equipment.id }, data: updatePayload });
          equipmentAudit = { entityId: equipment.id, changes: { updatedFields: updatePayload, approvalId: approval.id, reason: `Утверждены изменения паспорта: ${approval.title}` } };
        } else if (approval.type === 'DECOMMISSIONING' || approval.type === 'EQUIPMENT_DELETE') {
          await tx.equipment.update({ where: { id: equipment.id }, data: { status: 'DECOMMISSIONED' } });
          equipmentAudit = { entityId: equipment.id, changes: { status: { old: prevStatus, new: 'DECOMMISSIONED' }, approvalId: approval.id, reason: `Утверждено списание/вывод из эксплуатации: ${approval.title}` } };
        } else if (approval.type === 'STATUS_CHANGE' && proposed.targetStatus && proposed.targetStatus in EquipmentStatus) {
          await tx.equipment.update({ where: { id: equipment.id }, data: { status: proposed.targetStatus as EquipmentStatus } });
          equipmentAudit = { entityId: equipment.id, changes: { status: { old: prevStatus, new: proposed.targetStatus }, approvalId: approval.id, reason: `Утверждена смена рабочего статуса: ${approval.title}` } };
        }
      }

      const updated = await tx.equipmentApproval.updateMany({
        where: { id: params.id, status: 'PENDING' },
        data: {
          status: status as ApprovalStatus,
          reviewerId: status === 'CANCELLED' ? approval.reviewerId : user.userId,
          reviewedAt: status === 'CANCELLED' ? approval.reviewedAt : new Date(),
          resolutionComment: resolutionComment?.trim() || null,
        },
      });
      if (updated.count !== 1) throw new Error('APPROVAL_NOT_PENDING');

      const updatedApproval = await tx.equipmentApproval.findUnique({
        where: { id: params.id },
        include: {
          equipment: { select: { id: true, name: true, inventoryNumber: true, status: true } },
          requester: { select: { id: true, displayName: true, ldapLogin: true } },
          reviewer: { select: { id: true, displayName: true, ldapLogin: true } },
        },
      });
      return { approval, updatedApproval, equipmentAudit };
    });

    if (!result.updatedApproval) throw new Error('APPROVAL_NOT_FOUND');
    if (result.equipmentAudit) await logAuditEvent({ userId: user.userId, action: 'UPDATE', entityType: 'Equipment', entityId: result.equipmentAudit.entityId, changes: result.equipmentAudit.changes });

    try {
      if (result.approval.requesterId && (status === 'APPROVED' || status === 'REJECTED')) {
        const eqName = result.approval.equipment?.name || result.approval.title;
        const isApproved = status === 'APPROVED';
        await prisma.notification.create({
          data: {
            userId: result.approval.requesterId,
            title: isApproved ? 'Паспорт оборудования согласован' : 'Заявка на согласование отклонена',
            message: isApproved
              ? `Заявка по оборудованию «${eqName}» успешно утверждена и опубликована в реестре.`
              : `Заявка по оборудованию «${eqName}» отклонена. Причина: "${resolutionComment || 'Замечания проверяющего'}".`,
            type: 'EQUIPMENT_CHANGED',
            link: result.approval.equipmentId ? `/eps/${result.approval.equipmentId}` : '/eps/approvals',
          },
        });
      }
    } catch (notificationError) {
      console.error('Ошибка отправки уведомления:', notificationError);
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'EquipmentApproval',
      entityId: params.id,
      changes: { status: { old: result.approval.status, new: status }, resolutionComment, equipmentId: result.approval.equipmentId },
    });
    return NextResponse.json({ success: true, data: result.updatedApproval });
  } catch (error: unknown) {
    console.error('Ошибка обработки согласования:', error);
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: 'Validation error', details: error.issues }, { status: 400 });
    if (error instanceof Error && error.message === 'APPROVAL_NOT_FOUND') return NextResponse.json({ success: false, error: 'Заявка не найдена' }, { status: 404 });
    if (error instanceof Error && error.message === 'APPROVAL_NOT_PENDING') return NextResponse.json({ success: false, error: 'Решение по этой заявке уже было принято' }, { status: 400 });
    if (error instanceof Error && (error.message === 'APPROVAL_SELF_DECISION' || error.message === 'APPROVAL_FORBIDDEN')) return forbiddenResponse();
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Ошибка сохранения решения по согласованию', details: message }, { status: 500 });
  }
}
