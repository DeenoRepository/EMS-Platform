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
    } = body;

    const currentEquipment = await prisma.equipment.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!currentEquipment) {
      return NextResponse.json({ success: false, error: 'Оборудование не найдено' }, { status: 404 });
    }

    // Обновляем теги если переданы
    if (Array.isArray(tagIds)) {
      await prisma.equipmentTag.deleteMany({ where: { equipmentId: id } });
      if (tagIds.length > 0) {
        await prisma.equipmentTag.createMany({
          data: tagIds.map((tagId: string) => ({ equipmentId: id, tagId })),
        });
      }
    }

    const updated = await prisma.equipment.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        inventoryNumber: inventoryNumber !== undefined ? (inventoryNumber?.trim() || null) : undefined,
        serialNumber: serialNumber !== undefined ? (serialNumber?.trim() || null) : undefined,
        manufacturer: manufacturer !== undefined ? (manufacturer?.trim() || null) : undefined,
        model: model !== undefined ? (model?.trim() || null) : undefined,
        location: location !== undefined ? (location?.trim() || null) : undefined,
        status: status as EquipmentStatus | undefined,
        commissionDate: commissionDate !== undefined ? (commissionDate ? new Date(commissionDate) : null) : undefined,
        customFields: customFields !== undefined ? customFields : undefined,
      },
      include: {
        tags: { include: { tag: true } },
      },
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
    return NextResponse.json({ success: false, error: 'Ошибка обновления' }, { status: 500 });
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
