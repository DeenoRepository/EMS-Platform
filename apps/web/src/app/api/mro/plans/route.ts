import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { requireAuth } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';

export const dynamic = 'force-dynamic';

// GET /api/mro/plans - Список планов ТО
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, PERMISSIONS.MRO_SCHEDULE_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get('equipmentId');

    const where: any = {};
    if (equipmentId) where.equipmentId = equipmentId;

    const plans = await prisma.maintenancePlan.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            inventoryNumber: true,
            serialNumber: true,
            location: true,
          },
        },
        checklist: {
          select: {
            id: true,
            name: true,
            items: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        _count: {
          select: { schedules: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: plans });
  } catch (error: unknown) {
    console.error('Ошибка получения планов ТО:', error);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// POST /api/mro/plans - Создание нового плана ТО
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, PERMISSIONS.MRO_SCHEDULE_MANAGE);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { equipmentId, name, description, frequency, intervalDays, checklistId } = body;

    if (!equipmentId || !name || !frequency) {
      return NextResponse.json(
        { success: false, error: 'Обязательные поля: Оборудование, Название и Периодичность' },
        { status: 400 }
      );
    }

    const plan = await prisma.maintenancePlan.create({
      data: {
        equipmentId,
        name,
        description: description || null,
        frequency,
        intervalDays: intervalDays ? parseInt(intervalDays, 10) : null,
        checklistId: checklistId || null,
      },
      include: {
        equipment: true,
        checklist: true,
      },
    });

    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error: unknown) {
    console.error('Ошибка создания плана ТО:', error);
    return NextResponse.json({ success: false, error: 'Не удалось создать план ТО' }, { status: 500 });
  }
}
