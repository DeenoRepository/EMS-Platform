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

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_CUSTOM_FIELDS_MANAGE)) return forbiddenResponse();

    const body = await req.json();
    const { key, name, fieldType, unit, sectionId, isRequired, defaultValue, options, sortOrder } = body;

    if (!key || !name || !fieldType) {
      return NextResponse.json({ success: false, error: 'Заполните обязательные параметры поля' }, { status: 400 });
    }

    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const field = await prisma.customFieldDefinition.upsert({
      where: { key: cleanKey },
      update: {
        name: name.trim(),
        fieldType: fieldType as FieldType,
        unit: unit?.trim() || null,
        sectionId: sectionId || null,
        isRequired: Boolean(isRequired),
        defaultValue: defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : null,
        options: options || undefined,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
      create: {
        key: cleanKey,
        name: name.trim(),
        fieldType: fieldType as FieldType,
        unit: unit?.trim() || null,
        sectionId: sectionId || null,
        isRequired: Boolean(isRequired),
        defaultValue: defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : null,
        options: options || undefined,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
      include: {
        section: true,
      },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'CustomFieldDefinition',
      entityId: field.id,
      changes: { key: cleanKey, name, sectionId, unit },
    });

    return NextResponse.json({ success: true, data: field });
  } catch (error: any) {
    console.error('Ошибка POST /api/eps/custom-fields:', error);
    return NextResponse.json({ success: false, error: 'Ошибка сохранения кастомного поля' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_CUSTOM_FIELDS_MANAGE)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Не указан id' }, { status: 400 });
    }

    await prisma.customFieldDefinition.delete({ where: { id } });

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'CustomFieldDefinition',
      entityId: id,
    });

    return NextResponse.json({ success: true, message: 'Поле удалено' });
  } catch (error: any) {
    console.error('Ошибка DELETE /api/eps/custom-fields:', error);
    return NextResponse.json({ success: false, error: 'Ошибка удаления поля' }, { status: 500 });
  }
}
