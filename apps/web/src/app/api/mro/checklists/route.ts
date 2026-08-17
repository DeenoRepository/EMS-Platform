import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { requireAuth } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';

export const dynamic = 'force-dynamic';

// GET /api/mro/checklists - Список шаблонов чек-листов
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, PERMISSIONS.MRO_SCHEDULE_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const templates = await prisma.checklistTemplate.findMany({
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { plans: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('Ошибка получения шаблонов чек-листов:', error);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// POST /api/mro/checklists - Создание шаблона чек-листа
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, PERMISSIONS.MRO_SCHEDULE_MANAGE);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { name, description, items } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Укажите название чек-листа' }, { status: 400 });
    }

    const template = await prisma.checklistTemplate.create({
      data: {
        name,
        description: description || null,
        items: Array.isArray(items) && items.length > 0
          ? {
              create: items.map((item: any, idx: number) => ({
                description: item.description,
                itemType: item.itemType || 'BOOLEAN',
                sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : idx + 1,
                isRequired: item.isRequired ?? true,
              })),
            }
          : undefined,
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error: any) {
    console.error('Ошибка создания шаблона чек-листа:', error);
    return NextResponse.json({ success: false, error: 'Не удалось создать шаблон' }, { status: 500 });
  }
}
