import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, EquipmentStatus, Prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';
import { equipmentVisibilityWhere } from '@/lib/eps-state-machine';
import {
  buildEquipmentOrderBy,
  parseEquipmentFilters,
  type EquipmentFacets,
} from '@/lib/eps-equipment-filters';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const filters = parseEquipmentFilters(searchParams);

    const canManageDrafts = hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE) || user.roles.includes('admin');
    const where: Prisma.EquipmentWhereInput = equipmentVisibilityWhere(user.userId, canManageDrafts);

    if (filters.statuses.length === 1) {
      where.status = filters.statuses[0] as EquipmentStatus;
    } else if (filters.statuses.length > 1) {
      where.status = { in: filters.statuses as EquipmentStatus[] };
    }

    if (filters.manufacturer) {
      where.manufacturer = { contains: filters.manufacturer, mode: 'insensitive' };
    }

    if (filters.tagIds.length) {
      where.tags = {
        some: { tagId: { in: filters.tagIds } },
      };
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters.search) {
      const visibilityWhere = { ...where };
      delete visibilityWhere.OR;
      where.AND = [
        visibilityWhere,
        {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { inventoryNumber: { contains: filters.search, mode: 'insensitive' } },
            { serialNumber: { contains: filters.search, mode: 'insensitive' } },
            { manufacturer: { contains: filters.search, mode: 'insensitive' } },
            { model: { contains: filters.search, mode: 'insensitive' } },
            { location: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ];
      delete where.OR;
    }

    const [total, items, statusGroup, manufacturerGroup, locationGroup] = await Promise.all([
      prisma.equipment.count({ where }),
      prisma.equipment.findMany({
        where,
        include: {
          tags: {
            include: { tag: true },
          },
          photos: {
            where: { isPrimary: true, deletedAt: null },
            take: 1,
          },
          _count: {
            select: {
              documents: { where: { deletedAt: null } },
              photos: { where: { deletedAt: null } },
              maintenancePlans: true,
              spareParts: true,
            },
          },
        },
        orderBy: buildEquipmentOrderBy(filters),
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.equipment.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      prisma.equipment.groupBy({
        by: ['manufacturer'],
        where,
        _count: { _all: true },
      }),
      prisma.equipment.groupBy({
        by: ['location'],
        where,
        _count: { _all: true },
      }),
    ]);

    const statusCounts = {
      total: 0,
      active: 0,
      underRepair: 0,
      inStorage: 0,
      decommissioned: 0,
      draft: 0,
    };

    statusGroup.forEach((g) => {
      const count = g._count.status;
      statusCounts.total += count;
      if (g.status === 'ACTIVE') statusCounts.active = count;
      else if (g.status === 'UNDER_REPAIR') statusCounts.underRepair = count;
      else if (g.status === 'IN_STORAGE') statusCounts.inStorage = count;
      else if (g.status === 'DECOMMISSIONED') statusCounts.decommissioned = count;
      else if (g.status === 'DRAFT') statusCounts.draft = count;
    });

    const facets: EquipmentFacets = {
      manufacturers: manufacturerGroup
        .filter((g) => g.manufacturer)
        .map((g) => ({ value: g.manufacturer as string, count: g._count._all })),
      locations: locationGroup
        .filter((g) => g.location)
        .map((g) => ({ value: g.location as string, count: g._count._all })),
    };

    const formatted = items.map((item) => ({
      id: item.id,
      name: item.name,
      inventoryNumber: item.inventoryNumber,
      serialNumber: item.serialNumber,
      manufacturer: item.manufacturer,
      model: item.model,
      location: item.location,
      status: item.status,
      commissionDate: item.commissionDate,
      customFields: item.customFields || {},
      primaryPhoto: item.photos[0]?.filePath || null,
      tags: item.tags.map((t) => t.tag),
      counts: item._count,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      isOwner: item.createdById === user.userId,
    }));

    return NextResponse.json({
      success: true,
      data: {
        items: formatted,
        total,
         page: filters.page,
         pageSize: filters.pageSize,
         totalPages: Math.ceil(total / filters.pageSize) || 1,
        statusCounts,
        facets,
      },
    });
  } catch (error: unknown) {
    console.error('Ошибка /api/eps/equipment:', error);
    if (error instanceof Error && error.message === 'INVALID_EQUIPMENT_STATUS') {
      return NextResponse.json({ success: false, error: 'Некорректный статус оборудования' }, { status: 400 });
    }
    if (error instanceof z.ZodError || (error && typeof error === 'object' && 'issues' in error)) {
      return NextResponse.json({ success: false, error: 'Некорректные параметры фильтрации' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Ошибка получения реестра оборудования' }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1, 'Укажите наименование оборудования'),
  inventoryNumber: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.nativeEnum(EquipmentStatus).optional().nullable(),
  commissionDate: z.string().optional().nullable(),
  customFields: z.unknown().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
  asDraft: z.boolean().optional(),
  submitForApproval: z.boolean().optional(),
  approvalComment: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_CREATE)) return forbiddenResponse();

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
      asDraft,
      submitForApproval,
      approvalComment,
    } = createSchema.parse(body);

    // Проверка уникальности инвентарного номера если указан
    if (inventoryNumber) {
      const existing = await prisma.equipment.findUnique({
        where: { inventoryNumber: inventoryNumber.trim() },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Оборудование с таким инвентарным номером уже зарегистрировано' },
          { status: 400 }
        );
      }
    }

    const canManageDirectly = hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE) || user.roles.includes('admin');
    
    // Если пользователь запросил черновик или отправку на согласование, либо у него нет прав прямого утверждения
    const initialStatus: EquipmentStatus = (asDraft || submitForApproval || !canManageDirectly)
      ? 'DRAFT'
      : (status || 'ACTIVE');

    const { newEquipment, approvalRecord } = await prisma.$transaction(async (tx) => {
      const createdEquipment = await tx.equipment.create({
        data: {
          name: name.trim(),
          inventoryNumber: inventoryNumber?.trim() || null,
          serialNumber: serialNumber?.trim() || null,
          manufacturer: manufacturer?.trim() || null,
          model: model?.trim() || null,
          location: location?.trim() || null,
          status: initialStatus,
          commissionDate: commissionDate ? new Date(commissionDate) : null,
          customFields: customFields ? JSON.parse(JSON.stringify(customFields)) : {},
          createdById: user.userId,
          tags: Array.isArray(tagIds) && tagIds.length > 0
            ? {
                create: tagIds.map((tagId: string) => ({ tagId })),
              }
            : undefined,
        },
        include: {
          tags: { include: { tag: true } },
        },
      });

      let createdApproval: any = null;
      if (submitForApproval || (!canManageDirectly && !asDraft)) {
        createdApproval = await tx.equipmentApproval.create({
          data: {
            equipmentId: createdEquipment.id,
            type: 'COMMISSIONING',
            status: 'PENDING',
            title: `Регистрация оборудования: ${createdEquipment.name}`,
            description: approvalComment?.trim() || 'Первичная регистрация нового паспорта оборудования',
            proposedData: {
              targetStatus: status || 'ACTIVE',
              name: createdEquipment.name,
              inventoryNumber: createdEquipment.inventoryNumber,
              serialNumber: createdEquipment.serialNumber,
              manufacturer: createdEquipment.manufacturer,
              model: createdEquipment.model,
              location: createdEquipment.location,
              commissionDate: createdEquipment.commissionDate ? createdEquipment.commissionDate.toISOString() : null,
              customFields: createdEquipment.customFields,
            },
            requesterId: user.userId,
          },
        });
      }

      return { newEquipment: createdEquipment, approvalRecord: createdApproval };
    });

    // Аудит события
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'Equipment',
      entityId: newEquipment.id,
      changes: {
        name: newEquipment.name,
        inventoryNumber: newEquipment.inventoryNumber,
        status: newEquipment.status,
        approvalId: approvalRecord?.id || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...newEquipment,
        approval: approvalRecord,
      },
    });
  } catch (error: unknown) {
    console.error('Ошибка создания оборудования:', error);
    if (
      error instanceof z.ZodError ||
      (error && typeof error === 'object' && 'issues' in error) ||
      (error instanceof Error && error.message === 'INVALID_EQUIPMENT_STATUS')
    ) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error instanceof z.ZodError ? error.issues : undefined },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Ошибка сохранения оборудования', details: message }, { status: 500 });
  }
}
