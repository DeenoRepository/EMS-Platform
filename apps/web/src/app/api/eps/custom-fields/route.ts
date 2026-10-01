import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, FieldType } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const fields = await prisma.customFieldDefinition.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        section: true,
      },
    });

    return NextResponse.json({ success: true, data: fields });
  } catch (error: any) {
    console.error('Ошибка GET /api/eps/custom-fields:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения кастомных полей' }, { status: 500 });
  }
}

// POST: Создание/редактирование параметров заблокировано нормативным стандартом
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Технические разделы и характеристики паспорта зафиксированы нормативным стандартом и не подлежат созданию, изменению или удалению',
    },
    { status: 403 }
  );
}

// DELETE: Удаление параметров заблокировано нормативным стандартом
export async function DELETE(_req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'Технические разделы и характеристики паспорта зафиксированы нормативным стандартом и не подлежат созданию, изменению или удалению',
    },
    { status: 403 }
  );
}
