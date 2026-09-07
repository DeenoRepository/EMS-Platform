import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, ApprovalStatus, EquipmentStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { EquipmentService } from '@ems/eps';
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
    ) {
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
  } catch (error: unknown) {
    console.error('Ошибка получения заявки на согласование:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка получения заявки на согласование', details: message },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  status: z.nativeEnum(ApprovalStatus, { message: 'Не указан корректный статус согласования' }),
  resolutionComment: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = params;
    const body = await req.json();
    const { status, resolutionComment } = updateSchema.parse(body);

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

    const previousEquipment = approval.equipment
      ? {
          status: approval.equipment.status,
          name: approval.equipment.name,
          inventoryNumber: approval.equipment.inventoryNumber,
          serialNumber: approval.equipment.serialNumber,
          manufacturer: approval.equipment.manufacturer,
          model: approval.equipment.model,
          location: approval.equipment.location,
          commissionDate: approval.equipment.commissionDate,
          customFields: approval.equipment.customFields,
        }
      : null;

    const previousEquipmentStatus = approval.equipment?.status;

    // Применяем решение по согласованию через изолированный сервис EPS
    const updatedApproval = await EquipmentService.resolveApproval({
      approvalId: id,
      reviewerId: user.userId,
      status: status as ApprovalStatus,
      resolutionComment,
    });

    if (status === 'APPROVED' && approval.equipment && previousEquipment) {
      await logAuditEvent({
        userId: user.userId,
        action: 'UPDATE',
        entityType: 'Equipment',
        entityId: approval.equipment.id,
        changes: {
          status: {
            old: previousEquipment.status,
            new: updatedApproval.equipment?.status ?? previousEquipment.status,
          },
          approvalId: approval.id,
          reason: `Утверждены изменения оборудования: ${approval.title}`,
        },
      });
    }

    if (status === 'APPROVED' && approval.equipment) {
      await logAuditEvent({
        userId: user.userId,
        action: 'UPDATE',
        entityType: 'Equipment',
        entityId: approval.equipment.id,
        changes: {
          status: {
            old: previousEquipmentStatus,
            new: updatedApproval.equipment?.status ?? previousEquipmentStatus,
          },
          approvalId: approval.id,
          reason: `Утверждены изменения оборудования: ${approval.title}`,
        },
      });
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
  } catch (error: unknown) {
    console.error('Ошибка обработки согласования:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка сохранения решения по согласованию', details: message },
      { status: 500 }
    );
  }
}
