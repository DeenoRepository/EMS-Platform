import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export async function GET(req: NextRequest) {
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка получения тегов' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Ошибка создания тега' }, { status: 500 });
  }
}
