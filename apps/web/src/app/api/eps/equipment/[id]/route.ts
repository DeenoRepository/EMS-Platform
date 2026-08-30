import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, EquipmentStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';
import {
  buildEquipmentApprovalProposal,
  buildEquipmentUpdateData,
  getEffectiveCommissionDate,
} from './patch-update-model';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'eps-equipment-id-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW)) return forbiddenResponse();

    const { id } = await params;

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        photos: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        documents: {
          include: { uploadedBy: { select: { displayName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        spareParts: {
          include: {
            nomenclature: {
              include: {
                stockItems: {
                  include: { warehouse: true },
                },
              },
            },
          },
        },
        maintenancePlans: {
          include: {
            checklist: true,
            schedules: {
              orderBy: { scheduledDate: 'desc' },
              take: 5,
            },
          },
        },
        createdBy: {
          select: { displayName: true, ldapLogin: true },
        },
        approvals: {
          include: {
            requester: { select: { displayName: true, ldapLogin: true } },
            reviewer: { select: { displayName: true, ldapLogin: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ success: false, error: 'Оборудование не найдено' }, { status: 404 });
    }

    // Загрузка Jira-тикетов из кэша (если есть)
    const jiraIssues = await prisma.jiraIssueCache.findMany({
      where: { equipmentId: id },
      orderBy: { createdDate: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...equipment,
        jiraIssues,
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка получения паспорта оборудования');
  }
}

const updateSchema = z.object({
  name: z.string().optional(),
  inventoryNumber: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.nativeEnum(EquipmentStatus).optional(),
  commissionDate: z.string().optional().nullable(),
  commissioningDate: z.string().optional().nullable(),
  customFields: z.unknown().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
  submitForApproval: z.boolean().optional(),
  approvalComment: z.string().optional().nullable(),
  directSave: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'eps-equipment-id-patch' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_EDIT)) return forbiddenResponse();

    const { id } = await params;
    const body = await req.json();
    const parsedBody = updateSchema.parse(body);
    const {
      name,
      inventoryNumber,
      status,
      submitForApproval,
      approvalComment,
    } = parsedBody;

    const currentEquipment = await prisma.equipment.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!currentEquipment) {
      return NextResponse.json({ success: false, error: 'Оборудование не найдено' }, { status: 404 });
    }

    const parsedCommissionDate = getEffectiveCommissionDate(parsedBody);

    const canManageDirectly = hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE) || isAdminUser(user);
    const isOwner = currentEquipment.createdById === user.userId;
    const isDraft = currentEquipment.status === 'DRAFT';

    // Случай 1: Отправка на согласование или сохранение черновика изменений для утвержденного оборудования
    if (!isDraft && (!canManageDirectly || submitForApproval)) {
      const proposedData = buildEquipmentApprovalProposal(parsedBody, currentEquipment, parsedCommissionDate);

      const approval = await prisma.equipmentApproval.create({
        data: {
          equipmentId: id,
          type: 'PARAMETER_CHANGE',
          status: 'PENDING',
          title: submitForApproval
            ? `Изменение параметров: ${currentEquipment.name}`
            : `Черновик изменений: ${currentEquipment.name}`,
          description: approvalComment?.trim() || (submitForApproval ? 'Предложены изменения в паспорте оборудования' : 'Черновик изменений сохранен автором'),
          proposedData,
          requesterId: user.userId,
        },
      });

      await logAuditEvent({
        userId: user.userId,
        action: 'UPDATE',
        entityType: 'EquipmentApproval',
        entityId: approval.id,
        changes: { equipmentId: id, proposedData },
      });

      return NextResponse.json({
        success: true,
        message: submitForApproval
          ? 'Заявка на изменение параметров оборудования отправлена на согласование'
          : 'Черновик изменений сохранен',
        data: { ...currentEquipment, approval },
      });
    }

    // Случай 2: Редактирование черновика оборудования с отправкой на согласование (COMMISSIONING)
    if (submitForApproval && isDraft) {
      const updated = await prisma.$transaction(async (tx) => {
        if (Array.isArray(parsedBody.tagIds)) {
          await tx.equipmentTag.deleteMany({ where: { equipmentId: id } });
          if (parsedBody.tagIds.length > 0) {
            await tx.equipmentTag.createMany({
              data: parsedBody.tagIds.map((tagId: string) => ({ equipmentId: id, tagId })),
            });
          }
        }

        return tx.equipment.update({
          where: { id },
          data: buildEquipmentUpdateData(parsedBody, parsedCommissionDate),
          include: { tags: { include: { tag: true } } },
        });
      });

      const approval = await prisma.equipmentApproval.create({
        data: {
          equipmentId: id,
          type: 'COMMISSIONING',
          status: 'PENDING',
          title: `Регистрация оборудования: ${updated.name}`,
          description: approvalComment?.trim() || 'Черновик направлен на согласование',
          proposedData: {
            targetStatus: status || 'ACTIVE',
            name: updated.name,
            inventoryNumber: updated.inventoryNumber,
            serialNumber: updated.serialNumber,
            manufacturer: updated.manufacturer,
            model: updated.model,
            location: updated.location,
            commissionDate: updated.commissionDate ? updated.commissionDate.toISOString() : null,
            customFields: updated.customFields,
          },
          requesterId: user.userId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Паспорт оборудования отправлен на согласование',
        data: { ...updated, approval },
      });
    }

    // Случай 3: Прямое обновление черновика или прямое сохранение администратором
    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(parsedBody.tagIds)) {
        await tx.equipmentTag.deleteMany({ where: { equipmentId: id } });
        if (parsedBody.tagIds.length > 0) {
          await tx.equipmentTag.createMany({
            data: parsedBody.tagIds.map((tagId: string) => ({ equipmentId: id, tagId })),
          });
        }
      }

      return tx.equipment.update({
        where: { id },
        data: buildEquipmentUpdateData(parsedBody, parsedCommissionDate),
        include: {
          tags: { include: { tag: true } },
        },
      });
    });

    // Логирование аудита изменений
    const diff: Record<string, any> = {};
    if (name && name !== currentEquipment.name) diff.name = { old: currentEquipment.name, new: name };
    if (status && status !== currentEquipment.status) diff.status = { old: currentEquipment.status, new: status };
    if (parsedBody.inventoryNumber !== undefined && parsedBody.inventoryNumber !== currentEquipment.inventoryNumber) {
      diff.inventoryNumber = { old: currentEquipment.inventoryNumber, new: parsedBody.inventoryNumber };
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'Equipment',
      entityId: id,
      changes: Object.keys(diff).length > 0 ? diff : parsedBody,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return safeErrorResponse(error, 'Ошибка обновления оборудования');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'eps-equipment-id-delete' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_DELETE)) return forbiddenResponse();

    const { id } = await params;
    const equipment = await prisma.equipment.findUnique({ where: { id } });

    if (!equipment) {
      return NextResponse.json({ success: false, error: 'Оборудование не найдено' }, { status: 404 });
    }

    await prisma.equipment.delete({ where: { id } });

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'Equipment',
      entityId: id,
      changes: { deletedName: equipment.name, inventoryNumber: equipment.inventoryNumber },
    });

    return NextResponse.json({ success: true, message: 'Оборудование удалено' });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка удаления оборудования');
  }
}
