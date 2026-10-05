import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, EquipmentStatus, Prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';
import { buildEquipmentWhereInput, buildEquipmentOrderBy } from '@/lib/eps-query-builder';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(1000, Math.max(1, parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20', 10)));

    const where = buildEquipmentWhereInput(searchParams);
    const broadFilterIds = await resolveJsonFilters(searchParams);
    const effectiveWhere = broadFilterIds
      ? { AND: [where, { id: { in: broadFilterIds } }] }
      : where;
    const orderBy = buildEquipmentOrderBy(searchParams);

    const [total, items, statusGroup] = await Promise.all([
      prisma.equipment.count({ where: effectiveWhere }),
      prisma.equipment.findMany({
        where: effectiveWhere,
        include: {
          tags: {
            include: { tag: true },
          },
          photos: {
            where: { isPrimary: true },
            take: 1,
          },
          _count: {
            select: {
              documents: true,
              photos: true,
              maintenancePlans: true,
              spareParts: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.equipment.groupBy({
        by: ['status'],
        where: effectiveWhere,
        _count: { status: true },
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
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        statusCounts,
      },
    });
  } catch (error: unknown) {
    console.error('Ошибка /api/eps/equipment:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения реестра оборудования' }, { status: 500 });
  }
}

/** JSON fields are schemaless, so Prisma cannot search arbitrary custom keys.
 * Resolve broad search/range predicates against all records before pagination. */
async function resolveJsonFilters(params: URLSearchParams): Promise<string[] | null> {
  const search = params.get('search')?.trim().toLocaleLowerCase();
  const ranges = [
    ['actual_wear_percentage', params.get('wearMin'), params.get('wearMax')],
    ['calibration_interval', params.get('calibrationIntervalMin'), params.get('calibrationIntervalMax')],
  ] as const;
  if (!search && !ranges.some(([, min, max]) => min || max)) return null;

  const baseParams = new URLSearchParams(params);
  baseParams.delete('search');
  baseParams.delete('wearMin');
  baseParams.delete('wearMax');
  baseParams.delete('calibrationIntervalMin');
  baseParams.delete('calibrationIntervalMax');
  const baseWhere = buildEquipmentWhereInput(baseParams);
  const candidates = await prisma.equipment.findMany({ where: baseWhere, select: { id: true, customFields: true } });
  return candidates.filter(({ customFields }) => {
    const values = (customFields && typeof customFields === 'object' ? customFields : {}) as Record<string, unknown>;
    const textMatch = !search || JSON.stringify(values).toLocaleLowerCase().includes(search);
    const rangesMatch = ranges.every(([key, min, max]) => {
      if (!min && !max) return true;
      const value = Number(values[key]);
      if (!Number.isFinite(value)) return false;
      return (!min || value >= Number(min)) && (!max || value <= Number(max));
    });
    return textMatch && rangesMatch;
  }).map(({ id }) => id);
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

    const newEquipment = await prisma.equipment.create({
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

    let approvalRecord: any = null;

    // Если запрошена отправка на согласование
    if (submitForApproval || (!canManageDirectly && !asDraft)) {
      approvalRecord = await prisma.equipmentApproval.create({
        data: {
          equipmentId: newEquipment.id,
          type: 'COMMISSIONING',
          status: 'PENDING',
          title: `Регистрация оборудования: ${newEquipment.name}`,
          description: approvalComment?.trim() || 'Первичная регистрация нового паспорта оборудования',
          proposedData: {
            targetStatus: status || 'ACTIVE',
            name: newEquipment.name,
            inventoryNumber: newEquipment.inventoryNumber,
            serialNumber: newEquipment.serialNumber,
            manufacturer: newEquipment.manufacturer,
            model: newEquipment.model,
            location: newEquipment.location,
            commissionDate: newEquipment.commissionDate ? newEquipment.commissionDate.toISOString() : null,
            customFields: newEquipment.customFields,
          },
          requesterId: user.userId,
        },
      });
    }

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: 'Ошибка сохранения оборудования', details: message }, { status: 500 });
  }
}
