import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { requireAuth } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PERMISSIONS } from '@ems/shared';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/mro/schedules - Список запланированных и выполненных работ ТО
export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'mro-schedules-get' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.MRO_SCHEDULE_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get('equipmentId');
    const status = searchParams.get('status');
    const planId = searchParams.get('planId');

    const where: any = {};
    if (equipmentId) where.equipmentId = equipmentId;
    if (status === 'OVERDUE') {
      where.OR = [
        { status: 'MISSED' },
        { status: 'PLANNED', scheduledDate: { lt: new Date() } },
      ];
    } else if (status) {
      where.status = status;
    }
    if (planId) where.planId = planId;

    const schedules = await prisma.maintenanceSchedule.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            inventoryNumber: true,
            serialNumber: true,
            location: true,
            status: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            frequency: true,
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
            ldapLogin: true,
          },
        },
        checklistResult: true,
        usedParts: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return NextResponse.json({ success: true, data: schedules });
  } catch (error: unknown) {
    logger.error('Failed to fetch MRO schedules', {
      endpoint: 'mro-schedules-get',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// POST /api/mro/schedules - Создание регламентной работы ТО
export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'mro-schedules-post' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.MRO_SCHEDULE_MANAGE);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { equipmentId, planId, title, scheduledDate, notes } = body;

    if (!equipmentId || !title || !scheduledDate) {
      return NextResponse.json(
        { success: false, error: 'Обязательные поля: Оборудование, Название и Дата проведения' },
        { status: 400 }
      );
    }

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        equipmentId,
        planId: planId || null,
        title,
        scheduledDate: new Date(scheduledDate),
        notes: notes || null,
        status: 'PLANNED',
      },
      include: {
        equipment: true,
        plan: true,
      },
    });

    return NextResponse.json({ success: true, data: schedule }, { status: 201 });
  } catch (error: unknown) {
    logger.error('Failed to create MRO schedule', {
      endpoint: 'mro-schedules-post',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Не удалось создать график ТО' }, { status: 500 });
  }
}
