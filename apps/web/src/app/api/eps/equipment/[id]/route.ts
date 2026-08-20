import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, EquipmentStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW)) return forbiddenResponse();

    const { id } = params;

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
  } catch (error: any) {
    console.error('Ошибка /api/eps/equipment/[id]:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения паспорта оборудования' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_EDIT)) return forbiddenResponse();

    const { id } = params;
    const body = await req.json();
    const {
      name,
      inventoryNumber,
      serialNumber,
      manufacturer,
      model,
      location,
      status,
      commissionDate,
      customFields,
      tagIds,
      submitForApproval,
      approvalComment,
      directSave,
    } = body;

    const currentEquipment = await prisma.equipment.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!currentEquipment) {
      return NextResponse.json({ success: false, error: 'Оборудование не найдено' }, { status: 404 });
    }

    function parseDateSafe(val: any): Date | null {
      if (!val || typeof val !== 'string' || !val.trim()) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }

    const rawDate = commissionDate !== undefined ? commissionDate : (body as any).commissioningDate;
    const parsedCommissionDate = parseDateSafe(rawDate);

    const canManageDirectly = hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE) || user.roles.includes('admin');
    const isOwner = currentEquipment.createdById === user.userId;
    const isDraft = currentEquipment.status === 'DRAFT';

    // Случай 1: Отправка на согласование или сохранение черновика изменений для утвержденного оборудования
    if (!isDraft && (!canManageDirectly || submitForApproval)) {
      const proposedData: Record<string, any> = {
        name: name !== undefined ? name.trim() : currentEquipment.name,
        inventoryNumber: inventoryNumber !== undefined ? (inventoryNumber?.trim() || null) : currentEquipment.inventoryNumber,
        serialNumber: serialNumber !== undefined ? (serialNumber?.trim() || null) : currentEquipment.serialNumber,
        manufacturer: manufacturer !== undefined ? (manufacturer?.trim() || null) : currentEquipment.manufacturer,
        model: model !== undefined ? (model?.trim() || null) : currentEquipment.model,
        location: location !== undefined ? (location?.trim() || null) : currentEquipment.location,
        status: status !== undefined ? status : currentEquipment.status,
        commissionDate: parsedCommissionDate ? parsedCommissionDate.toISOString() : (currentEquipment.commissionDate ? currentEquipment.commissionDate.toISOString() : null),
        customFields: customFields !== undefined ? customFields : currentEquipment.customFields,
        tagIds: Array.isArray(tagIds) ? tagIds : currentEquipment.tags.map((t) => t.tagId),
      };

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
        if (Array.isArray(tagIds)) {
          await tx.equipmentTag.deleteMany({ where: { equipmentId: id } });
          if (tagIds.length > 0) {
            await tx.equipmentTag.createMany({
              data: tagIds.map((tagId: string) => ({ equipmentId: id, tagId })),
            });
          }
        }

        return tx.equipment.update({
          where: { id },
          data: {
            name: name !== undefined ? name.trim() : undefined,
            inventoryNumber: inventoryNumber !== undefined ? (inventoryNumber?.trim() || null) : undefined,
            serialNumber: serialNumber !== undefined ? (serialNumber?.trim() || null) : undefined,
            manufacturer: manufacturer !== undefined ? (manufacturer?.trim() || null) : undefined,
            model: model !== undefined ? (model?.trim() || null) : undefined,
            location: location !== undefined ? (location?.trim() || null) : undefined,
            commissionDate: rawDate !== undefined ? parsedCommissionDate : undefined,
            customFields: customFields !== undefined ? customFields : undefined,
          },
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
      if (Array.isArray(tagIds)) {
        await tx.equipmentTag.deleteMany({ where: { equipmentId: id } });
        if (tagIds.length > 0) {
          await tx.equipmentTag.createMany({
            data: tagIds.map((tagId: string) => ({ equipmentId: id, tagId })),
          });
        }
      }

      return tx.equipment.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          inventoryNumber: inventoryNumber !== undefined ? (inventoryNumber?.trim() || null) : undefined,
          serialNumber: serialNumber !== undefined ? (serialNumber?.trim() || null) : undefined,
          manufacturer: manufacturer !== undefined ? (manufacturer?.trim() || null) : undefined,
          model: model !== undefined ? (model?.trim() || null) : undefined,
          location: location !== undefined ? (location?.trim() || null) : undefined,
          status: status as EquipmentStatus | undefined,
          commissionDate: rawDate !== undefined ? parsedCommissionDate : undefined,
          customFields: customFields !== undefined ? customFields : undefined,
        },
        include: {
          tags: { include: { tag: true } },
        },
      });
    });

    // Логирование аудита изменений
    const diff: Record<string, any> = {};
    if (name && name !== currentEquipment.name) diff.name = { old: currentEquipment.name, new: name };
    if (status && status !== currentEquipment.status) diff.status = { old: currentEquipment.status, new: status };
    if (inventoryNumber !== undefined && inventoryNumber !== currentEquipment.inventoryNumber) {
      diff.inventoryNumber = { old: currentEquipment.inventoryNumber, new: inventoryNumber };
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'Equipment',
      entityId: id,
      changes: Object.keys(diff).length > 0 ? diff : body,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Ошибка обновления оборудования:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Ошибка обновления оборудования' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_DELETE)) return forbiddenResponse();

    const { id } = params;
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка удаления' }, { status: 500 });
  }
}
