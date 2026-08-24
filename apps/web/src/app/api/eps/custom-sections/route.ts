import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';

export const dynamic = 'force-dynamic';

// GET: Получение всех кастомных разделов с их полями
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW) && !hasPermission(user, PERMISSIONS.EPS_CUSTOM_FIELDS_MANAGE)) {
      return forbiddenResponse();
    }

    let sections = await prisma.customSection.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        fields: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // Auto-bootstrap standard sections if empty
    if (sections.length === 0) {
      const standardSections = [
        { code: 'classifiers', name: 'Общероссийские и отраслевые классификаторы', description: 'Коды ОКОФ, ОКПД2, классификаторы техпроцесса и децимальные номера', icon: 'Category', sortOrder: 1 },
        { code: 'condition_wear', name: 'Техническое состояние, износ и критичность', description: 'Процент износа, критичность для производства, класс чистоты ISO, признаки уникальности и импорта', icon: 'Speed', sortOrder: 2 },
        { code: 'maintenance_regulations', name: 'Регламент ТОиР и график обслуживания', description: 'Периодичность ТО, график на текущий год, ответственные лица и связь с 1С', icon: 'Shield', sortOrder: 3 },
        { code: 'electrical', name: 'Электротехнические параметры', description: 'Характеристики электропитания, мощности, напряжения и фазности', icon: 'Bolt', sortOrder: 4 },
        { code: 'mechanics', name: 'Механика, гидравлика и среда', description: 'Рабочие среды, давление, обороты и смазочные материалы', icon: 'WaterDrop', sortOrder: 5 },
        { code: 'operational', name: 'Эксплуатационные требования и метрология', description: 'Непрерывность процесса, поверки датчиков и регламентные условия', icon: 'Straighten', sortOrder: 6 },
      ];

      for (const s of standardSections) {
        await prisma.customSection.upsert({
          where: { code: s.code },
          create: s,
          update: { name: s.name, sortOrder: s.sortOrder },
        });
      }

      // Link orphan fields to matching sections
      const allSections = await prisma.customSection.findMany();
      const secMap = new Map(allSections.map((s) => [s.code, s.id]));

      const fieldSectionMapping: Record<string, string> = {
        decimal_number: 'classifiers',
        okof_code: 'classifiers',
        okpd2_code: 'classifiers',
        process_classifier_code: 'classifiers',
        equipment_group: 'classifiers',
        equipment_type: 'classifiers',
        actual_wear_percentage: 'condition_wear',
        criticality: 'condition_wear',
        clean_room_class: 'condition_wear',
        is_unique: 'condition_wear',
        is_imported: 'condition_wear',
        country_origin: 'condition_wear',
        prod_year: 'condition_wear',
        comm_year: 'condition_wear',
        equipment_age: 'condition_wear',
        maintenance_periodicity: 'maintenance_regulations',
        maintenance_schedule_year: 'maintenance_regulations',
        to_count_scheduled: 'maintenance_regulations',
        responsible_person_name: 'maintenance_regulations',
        external_system_id: 'maintenance_regulations',
        operating_voltage: 'electrical',
        power_kw: 'electrical',
        nominal_current: 'electrical',
        phase_count: 'electrical',
        ups_required: 'electrical',
        operating_pressure: 'mechanics',
        coolant_type: 'mechanics',
        rotation_speed: 'mechanics',
        is_critical_path: 'operational',
        calibration_interval: 'operational',
      };

      for (const [key, secCode] of Object.entries(fieldSectionMapping)) {
        const secId = secMap.get(secCode);
        if (secId) {
          await prisma.customFieldDefinition.updateMany({
            where: { key, sectionId: null },
            data: { sectionId: secId },
          });
        }
      }

      sections = await prisma.customSection.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          fields: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    }

    const unassignedFields = await prisma.customFieldDefinition.findMany({
      where: { sectionId: null },
      orderBy: { sortOrder: 'asc' },
    });

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

    if (!hasPermission(user, PERMISSIONS.EPS_CUSTOM_FIELDS_MANAGE) && !hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE)) {
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

    if (!hasPermission(user, PERMISSIONS.EPS_CUSTOM_FIELDS_MANAGE) && !hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE)) {
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

    if (!hasPermission(user, PERMISSIONS.EPS_CUSTOM_FIELDS_MANAGE) && !hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE)) {
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
