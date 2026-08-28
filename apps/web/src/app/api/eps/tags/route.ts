import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'eps-tags-get' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW)) return forbiddenResponse();

    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { equipment: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color || 'primary.main',
      equipmentCount: t._count.equipment,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Ошибка получения тегов' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'eps-tags-post' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_CREATE)) return forbiddenResponse();

    const body = await req.json();
    const { name, color } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Укажите название тега' }, { status: 400 });
    }

    const tag = await prisma.tag.upsert({
      where: { name: name.trim() },
      update: { color: color || 'primary.main' },
      create: { name: name.trim(), color: color || 'primary.main' },
    });

    return NextResponse.json({ success: true, data: tag });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Ошибка создания тега' }, { status: 500 });
  }
}
