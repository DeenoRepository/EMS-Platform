import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { requireAuth } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PERMISSIONS } from '@ems/shared';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/mro/schedules/[id] - Детали работы ТО
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'mro-sched-id-get' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.MRO_SCHEDULE_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id: (await params).id },
      include: {
        equipment: true,
        plan: {
          include: {
            checklist: {
              include: {
                items: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
        completedBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        checklistResult: true,
        usedParts: true,
      },
    });

    if (!schedule) {
      return NextResponse.json({ success: false, error: 'Запись графика ТО не найдена' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: schedule });
  } catch (error: unknown) {
    logger.error('Failed to fetch MRO schedule details', {
      endpoint: 'mro-schedule-id-get',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// PATCH /api/mro/schedules/[id] - Обновление / Завершение работы ТО с чек-листом и списанием запчастей
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'mro-sched-id-patch' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, [PERMISSIONS.MRO_SCHEDULE_MANAGE, PERMISSIONS.MRO_EXECUTION_COMPLETE]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { status, notes, checklistItems, usedParts } = body;

    const existingSchedule = await prisma.maintenanceSchedule.findUnique({
      where: { id: (await params).id },
      include: { equipment: true },
    });

    if (!existingSchedule) {
      return NextResponse.json({ success: false, error: 'Запись графика ТО не найдена' }, { status: 404 });
    }

    // Выполняем все действия атомарно в транзакции
    const updated = await prisma.$transaction(async (tx) => {
      let isCompleted = status === 'COMPLETED';

      // 1. Сохранение результатов чек-листа
      if (checklistItems && Array.isArray(checklistItems)) {
        await tx.checklistResult.upsert({
          where: { scheduleId: (await params).id },
          create: {
            scheduleId: (await params).id,
            items: checklistItems,
            completedById: auth.user.userId,
            completedAt: new Date(),
          },
          update: {
            items: checklistItems,
            completedById: auth.user.userId,
            completedAt: new Date(),
          },
        });
      }

      // 2. Учёт и транзакционное списание запчастей со склада WMS
      if (usedParts && Array.isArray(usedParts) && usedParts.length > 0) {
        for (const part of usedParts) {
          const { nomenclatureId, warehouseId, quantity } = part;
          if (!nomenclatureId || !warehouseId || !quantity || Number(quantity) <= 0) continue;

          const numQty = Number(quantity);

          // Создаем запись об использованной детали в ТО
          await tx.maintenanceUsedPart.create({
            data: {
              scheduleId: (await params).id,
              nomenclatureId,
              warehouseId,
              quantity: numQty,
            },
          });

          // Создаем операцию списания в WMS
          const docNumber = `ТО-#${existingSchedule.id.slice(0, 8)}`;
          await tx.stockOperation.create({
            data: {
              warehouseId,
              type: 'ISSUE',
              document: docNumber,
              createdById: auth.user.userId,
              comment: `Списание запчастей по наряду ТО #${existingSchedule.id.slice(0, 8)} (${existingSchedule.title})`,
              items: {
                create: {
                  nomenclatureId,
                  quantity: numQty,
                },
              },
            },
          });

          // Списываем количество из ячеек/остатков на складе
          const stockItem = await tx.stockItem.findFirst({
            where: {
              nomenclatureId,
              warehouseId,
            },
          });

          if (!stockItem || Number(stockItem.quantity) < numQty) {
            const availableQty = stockItem ? Number(stockItem.quantity) : 0;
            throw new Error(`Недостаточно остатка номенклатуры на складе для списания. Требуется: ${numQty}, доступно: ${availableQty}`);
          }

          await tx.stockItem.update({
            where: { id: stockItem.id },
            data: {
              quantity: { decrement: numQty },
            },
          });
        }
      }

      // 3. Обновляем статус графика ТО
      return await tx.maintenanceSchedule.update({
        where: { id: (await params).id },
        data: {
          status: status || existingSchedule.status,
          notes: notes !== undefined ? notes : existingSchedule.notes,
          completedDate: isCompleted ? new Date() : existingSchedule.completedDate,
          completedById: isCompleted ? auth.user.userId : existingSchedule.completedById,
        },
        include: {
          equipment: true,
          checklistResult: true,
          usedParts: true,
        },
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Не удалось обновить запись ТО');
  }
}
