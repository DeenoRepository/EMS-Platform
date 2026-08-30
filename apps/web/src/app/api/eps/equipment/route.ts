import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, EquipmentStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';
import {
  buildEquipmentStatusCounts,
  buildEquipmentWhereInput,
  parseEquipmentListQuery,
} from './get-query';

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'eps-equipment-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW)) return forbiddenResponse();

    const query = parseEquipmentListQuery(new URL(req.url).searchParams);
    const { page, pageSize } = query;
    const where = buildEquipmentWhereInput(query);

    const [total, items, statusGroup] = await Promise.all([
      prisma.equipment.count({ where }),
      prisma.equipment.findMany({
        where,
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
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.equipment.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const statusCounts = buildEquipmentStatusCounts(statusGroup);

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
    return safeErrorResponse(error, 'Ошибка получения реестра оборудования');
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
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'eps-equipment-post' });
  if (rateLimitError) return rateLimitError;

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

    const canManageDirectly = hasPermission(user, PERMISSIONS.EPS_APPROVALS_MANAGE) || isAdminUser(user);
    
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return safeErrorResponse(error, 'Ошибка сохранения оборудования');
  }
}
