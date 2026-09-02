import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, PurchaseRequestStatus } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';
import {
  generatePurchaseRequestNumber,
  buildPurchaseRequestWhereInput,
  calculateEstimatedTotal,
  isPurchaseAdmin,
  resolveUserWarehouseIds,
} from '@/lib/prm-requests-service';
import { parsePurchaseRequestListQuery, buildPurchaseRequestStats } from './get-query';

export const dynamic = 'force-dynamic';

const requestInclude = {
  targetWarehouse: { select: { id: true, name: true, code: true } },
  requester: { select: { id: true, displayName: true, ldapLogin: true } },
  reviewer: { select: { id: true, displayName: true, ldapLogin: true } },
  equipment: { select: { id: true, name: true, inventoryNumber: true } },
  items: {
    include: {
      nomenclature: { select: { id: true, name: true, article: true, unit: true } },
    },
  },
} as const;

// GET /api/prm/requests - Список заявок на закупку ТМЦ
export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, prefix: 'prm-requests-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.PRM_REQUESTS_VIEW) &&
      !hasPermission(user, PERMISSIONS.PRM_REQUESTS_CREATE) &&
      !hasPermission(user, PERMISSIONS.PRM_REQUESTS_MANAGE)
    ) {
      return forbiddenResponse();
    }

    const query = parsePurchaseRequestListQuery(new URL(req.url).searchParams);
    const { page, pageSize, status, scope, warehouseId, search } = query;

    const isAdmin = isPurchaseAdmin(user);
    const userWarehouseIds = await resolveUserWarehouseIds({ isAdmin, userId: user.userId });

    const where = buildPurchaseRequestWhereInput({
      scope,
      status,
      warehouseId,
      search,
      userId: user.userId,
      isAdmin,
      userWarehouseIds,
    });

    const canReview = hasPermission(user, PERMISSIONS.PRM_REQUESTS_MANAGE) || isAdmin;

    const [items, total, allForStats, myForStats] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where,
        include: requestInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseRequest.count({ where }),
      prisma.purchaseRequest.findMany({ select: { status: true, requesterId: true } }),
      prisma.purchaseRequest.findMany({
        where: { requesterId: user.userId },
        select: { status: true, requesterId: true },
      }),
    ]);

    const stats = buildPurchaseRequestStats(allForStats, myForStats, canReview);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        stats,
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка получения списка заявок на закупку ТМЦ', 500, {
      endpoint: 'prm-requests-get',
    });
  }
}

const createItemSchema = z.object({
  nomenclatureId: z.string().min(1, 'Не указана номенклатура'),
  requestedQty: z.number().positive('Количество должно быть больше нуля'),
  estimatedPrice: z.number().nonnegative('Цена не может быть отрицательной').default(0),
  comment: z.string().optional(),
});

const createSchema = z.object({
  targetWarehouseId: z.string().min(1, 'Не указан склад назначения'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  justification: z.string().optional(),
  supplierName: z.string().optional(),
  requiredByDate: z.string().optional(),
  equipmentId: z.string().optional(),
  maintenanceScheduleId: z.string().optional(),
  currency: z.string().default('RUB'),
  items: z.array(createItemSchema).min(1, 'Добавьте хотя бы одну позицию ТМЦ'),
});

// POST /api/prm/requests - Создание заявки на закупку ТМЦ (статус DRAFT)
export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, prefix: 'prm-requests-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.PRM_REQUESTS_CREATE)) return forbiddenResponse();

    const body = await req.json();
    const parsed = createSchema.parse(body);

    const targetWarehouse = await prisma.warehouse.findUnique({
      where: { id: parsed.targetWarehouseId },
      select: { id: true, name: true, isActive: true },
    });
    if (!targetWarehouse || !targetWarehouse.isActive) {
      return NextResponse.json(
        { success: false, error: 'Склад назначения не найден или неактивен' },
        { status: 400 },
      );
    }

    const estimatedTotal = calculateEstimatedTotal(parsed.items);
    const requestNumber = generatePurchaseRequestNumber();

    const created = await prisma.purchaseRequest.create({
      data: {
        requestNumber,
        status: PurchaseRequestStatus.DRAFT,
        priority: parsed.priority,
        targetWarehouseId: parsed.targetWarehouseId,
        requesterId: user.userId,
        justification: parsed.justification?.trim() || null,
        supplierName: parsed.supplierName?.trim() || null,
        requiredByDate: parsed.requiredByDate ? new Date(parsed.requiredByDate) : null,
        equipmentId: parsed.equipmentId || null,
        maintenanceScheduleId: parsed.maintenanceScheduleId || null,
        estimatedTotal,
        currency: parsed.currency,
        items: {
          create: parsed.items.map((it) => ({
            nomenclatureId: it.nomenclatureId,
            requestedQty: it.requestedQty,
            estimatedPrice: it.estimatedPrice,
            comment: it.comment?.trim() || null,
          })),
        },
      },
      include: requestInclude,
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'PurchaseRequest',
      entityId: created.id,
      changes: {
        requestNumber,
        targetWarehouse: targetWarehouse.name,
        itemsCount: parsed.items.length,
        estimatedTotal,
      },
    });

    return NextResponse.json({
      success: true,
      data: created,
      message: `Заявка ${requestNumber} создана в статусе черновика.`,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Ошибка валидации', details: error.issues },
        { status: 400 },
      );
    }
    return safeErrorResponse(error, 'Ошибка создания заявки на закупку ТМЦ', 500, {
      endpoint: 'prm-requests-post',
    });
  }
}
