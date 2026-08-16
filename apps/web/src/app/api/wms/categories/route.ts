import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_STOCK_VIEW)) return forbiddenResponse();

    const categories = await prisma.nomenclatureCategory.findMany({
      include: {
        children: true,
        _count: {
          select: { items: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    console.error('Ошибка получения категорий:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения категорий' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_NOMENCLATURE_MANAGE) && !user.roles.includes('admin')) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { name, parentId } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Укажите название категории' }, { status: 400 });
    }

    const category = await prisma.nomenclatureCategory.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
      },
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error: any) {
    console.error('Ошибка создания категории:', error);
    return NextResponse.json({ success: false, error: 'Ошибка создания категории' }, { status: 500 });
  }
}
