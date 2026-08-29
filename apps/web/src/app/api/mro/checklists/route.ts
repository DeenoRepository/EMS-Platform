import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { requireAuth } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PERMISSIONS } from '@ems/shared';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/mro/checklists - Список шаблонов чек-листов
export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'mro-checklists-get' });
  if (rateLimitError) return rateLimitError;

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
  } catch (error: unknown) {
    logger.error('Failed to fetch MRO checklist templates', {
      endpoint: 'mro-checklists-get',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// POST /api/mro/checklists - Создание шаблона чек-листа
export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'mro-checklists-post' });
  if (rateLimitError) return rateLimitError;

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
  } catch (error: unknown) {
    logger.error('Failed to create MRO checklist template', {
      endpoint: 'mro-checklists-post',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Не удалось создать шаблон' }, { status: 500 });
  }
}
