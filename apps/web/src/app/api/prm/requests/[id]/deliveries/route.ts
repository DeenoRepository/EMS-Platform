import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse, isAdminUser } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma, OperationType, PurchaseRequestStatus } from '@ems/database';
import { PERMISSIONS, type JwtUserPayload } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { z } from 'zod';
import {
  buildReceiptOperationPayload,
  calculateDeliveryStatus,
  calculateReceivedQuantity,
  validateDeliveryInput,
  type DeliveryItemInput,
  type DeliveryRequestItemState,
} from '@/lib/prm-delivery-service';

export const dynamic = 'force-dynamic';

const deliveryItemSchema = z.object({
  requestItemId: z.string().min(1, 'Не указана позиция заявки'),
  nomenclatureId: z.string().min(1, 'Не указана номенклатура'),
  receivedQty: z.number().positive('Количество приёмки должно быть больше нуля'),
  actualPrice: z.number().nonnegative('Фактическая цена не может быть отрицательной').nullable().optional(),
});

const deliverySchema = z.object({
  idempotencyKey: z.string().trim().min(1, 'Не указан ключ идемпотентности').max(200),
  deliveryDate: z.string().datetime().optional(),
  supplierName: z.string().max(500).optional().nullable(),
  document: z.string().max(500).optional().nullable(),
  items: z.array(deliveryItemSchema).min(1, 'Добавьте хотя бы одну позицию приёмки'),
});

const requestInclude = {
  targetWarehouse: { select: { id: true, name: true, code: true, responsibleUserId: true } },
  requester: { select: { id: true, displayName: true } },
  items: {
    include: {
      nomenclature: { select: { id: true, name: true, unit: true } },
    },
  },
} as const;

function isDeliveryOperator(user: JwtUserPayload): boolean {
  return (
    isAdminUser(user) ||
    hasPermission(user, PERMISSIONS.PRM_REQUESTS_MANAGE) ||
    hasPermission(user, PERMISSIONS.WMS_OPERATIONS_CREATE)
  );
}

function toRequestItemState(item: {
  id: string;
  nomenclatureId: string;
  requestedQty: unknown;
  receivedQty: unknown;
}): DeliveryRequestItemState {
  return {
    id: item.id,
    nomenclatureId: item.nomenclatureId,
    requestedQty: Number(item.requestedQty),
    receivedQty: Number(item.receivedQty),
  };
}

function findDeliveryItem(
  items: DeliveryItemInput[],
  requestItemId: string,
): DeliveryItemInput | undefined {
  return items.find((item) => item.requestItemId === requestItemId);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, prefix: 'prm-request-delivery' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!isDeliveryOperator(user)) return forbiddenResponse();

    const parsed = deliverySchema.parse(await req.json());
    const { id } = await params;

    const duplicate = await prisma.purchaseDelivery.findUnique({
      where: { idempotencyKey: parsed.idempotencyKey },
      include: { items: true, stockOperation: true },
    });
    if (duplicate) {
      return NextResponse.json({ success: true, data: duplicate, duplicate: true });
    }

    const request = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: requestInclude,
    });
    if (!request) {
      return NextResponse.json({ success: false, error: 'Заявка не найдена' }, { status: 404 });
    }

    const isAdmin = isAdminUser(user) || hasPermission(user, PERMISSIONS.PRM_REQUESTS_MANAGE);
    if (!isAdmin && request.targetWarehouse.responsibleUserId !== user.userId) {
      return forbiddenResponse('Принимать поставку может только МОЛ целевого склада');
    }

    const deliveryItems = parsed.items as DeliveryItemInput[];
    const validation = validateDeliveryInput({
      requestStatus: request.status,
      requestItems: request.items.map(toRequestItemState),
      deliveryItems,
    });
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const operationPayload = buildReceiptOperationPayload({
      warehouseId: request.targetWarehouseId,
      createdById: user.userId,
      supplierName: parsed.supplierName,
      document: parsed.document,
      requestNumber: request.requestNumber,
      items: deliveryItems,
    });

    const result = await prisma.$transaction(async (tx) => {
      const operation = await tx.stockOperation.create({
        data: {
          ...operationPayload,
          type: OperationType.RECEIPT,
          date: parsed.deliveryDate ? new Date(parsed.deliveryDate) : new Date(),
          items: { create: operationPayload.items },
        },
      });

      for (const item of deliveryItems) {
        await tx.stockItem.upsert({
          where: {
            warehouseId_nomenclatureId: {
              warehouseId: request.targetWarehouseId,
              nomenclatureId: item.nomenclatureId,
            },
          },
          update: { quantity: { increment: item.receivedQty } },
          create: {
            warehouseId: request.targetWarehouseId,
            nomenclatureId: item.nomenclatureId,
            quantity: item.receivedQty,
          },
        });
      }

      const delivery = await tx.purchaseDelivery.create({
        data: {
          requestId: request.id,
          warehouseId: request.targetWarehouseId,
          deliveryDate: parsed.deliveryDate ? new Date(parsed.deliveryDate) : new Date(),
          supplierName: parsed.supplierName?.trim() || null,
          document: parsed.document?.trim() || null,
          idempotencyKey: parsed.idempotencyKey,
          createdById: user.userId,
          stockOperationId: operation.id,
          items: {
            create: deliveryItems.map((item) => ({
              requestItemId: item.requestItemId,
              receivedQty: item.receivedQty,
              actualPrice: item.actualPrice ?? null,
            })),
          },
        },
        include: { items: true, stockOperation: true },
      });

      for (const requestItem of request.items) {
        const deliveryItem = findDeliveryItem(deliveryItems, requestItem.id);
        if (!deliveryItem) continue;
        await tx.purchaseRequestItem.update({
          where: { id: requestItem.id },
          data: {
            receivedQty: calculateReceivedQuantity(Number(requestItem.receivedQty), deliveryItem.receivedQty),
            actualPrice: deliveryItem.actualPrice ?? undefined,
          },
        });
      }

      const nextItems = request.items.map((requestItem) => {
        const deliveryItem = findDeliveryItem(deliveryItems, requestItem.id);
        return {
          requestedQty: Number(requestItem.requestedQty),
          receivedQty: deliveryItem
            ? calculateReceivedQuantity(Number(requestItem.receivedQty), deliveryItem.receivedQty)
            : Number(requestItem.receivedQty),
        };
      });
      const nextStatus = calculateDeliveryStatus(nextItems);

      const updatedRequest = await tx.purchaseRequest.update({
        where: { id: request.id },
        data: { status: nextStatus },
        include: requestInclude,
      });

      return { delivery, operation, request: updatedRequest, nextStatus };
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'PurchaseRequest',
      entityId: request.id,
      changes: {
        action: 'RECEIVE_PURCHASE_DELIVERY',
        requestNumber: request.requestNumber,
        deliveryId: result.delivery.id,
        stockOperationId: result.operation.id,
        status: { old: request.status, new: result.nextStatus },
        itemsCount: deliveryItems.length,
      },
    });

    if (request.requesterId !== user.userId) {
      await prisma.notification.create({
        data: {
          userId: request.requesterId,
          title: 'Поставка по заявке зарегистрирована',
          message: `По заявке № ${request.requestNumber} зарегистрирована поставка. Статус: ${result.nextStatus}.`,
          type: 'SYSTEM',
          link: `/prm/${request.id}`,
        },
      }).catch(() => undefined);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Ошибка валидации', details: error.issues }, { status: 400 });
    }
    return safeErrorResponse(error, 'Ошибка регистрации поставки по заявке', 500, {
      endpoint: 'prm-request-delivery',
    });
  }
}
