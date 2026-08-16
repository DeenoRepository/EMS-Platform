import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';
import { logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

// GET: Получение всех кастомных разделов с их полями
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const [sections, unassignedFields] = await Promise.all([
      prisma.customSection.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          fields: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      prisma.customFieldDefinition.findMany({
        where: { sectionId: null },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        sections,
        unassignedFields,
      },
    });
  } catch (error: any) {
    console.error('Ошибка GET /api/eps/custom-sections:', error);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

// POST: Создание нового кастомного раздела
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    if (!user.permissions.includes(PERMISSIONS.ADMIN_USERS_MANAGE) && !user.roles.includes('admin')) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { code, name, description, icon, sortOrder } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, error: 'Укажите название раздела' }, { status: 400 });
    }

    const sectionCode = (code || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/gi, '_')
      .replace(/_+/g, '_');

    const existing = await prisma.customSection.findUnique({
      where: { code: sectionCode },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: 'Раздел с таким системным кодом уже существует' }, { status: 409 });
    }

    const section = await prisma.customSection.create({
      data: {
        code: sectionCode,
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        sortOrder: Number(sortOrder) || 0,
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'CustomSection',
      entityId: section.id,
      changes: { code: section.code, name: section.name },
    });

    return NextResponse.json({ success: true, data: section }, { status: 201 });
  } catch (error: any) {
    console.error('Ошибка POST /api/eps/custom-sections:', error);
    return NextResponse.json({ success: false, error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}

// PATCH: Редактирование кастомного раздела
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    if (!user.permissions.includes(PERMISSIONS.ADMIN_USERS_MANAGE) && !user.roles.includes('admin')) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { id, name, description, icon, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID раздела обязателен' }, { status: 400 });
    }

    const updated = await prisma.customSection.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        description: description !== undefined ? description?.trim() || null : undefined,
        icon: icon !== undefined ? icon?.trim() || null : undefined,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'CustomSection',
      entityId: updated.id,
      changes: body,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Ошибка PATCH /api/eps/custom-sections:', error);
    return NextResponse.json({ success: false, error: 'Ошибка обновления раздела' }, { status: 500 });
  }
}

// DELETE: Удаление кастомного раздела
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    if (!user.permissions.includes(PERMISSIONS.ADMIN_USERS_MANAGE) && !user.roles.includes('admin')) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID раздела обязателен' }, { status: 400 });
    }

    const deleted = await prisma.customSection.delete({
      where: { id },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'CustomSection',
      entityId: id,
      changes: { deletedName: deleted.name },
    });

    return NextResponse.json({ success: true, message: 'Раздел удален' });
  } catch (error: any) {
    console.error('Ошибка DELETE /api/eps/custom-sections:', error);
    return NextResponse.json({ success: false, error: 'Ошибка удаления раздела' }, { status: 500 });
  }
}
