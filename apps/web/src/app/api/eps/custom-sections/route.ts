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

    // 26 Canonical Custom Fields Specification
    const CANONICAL_SPECS: {
      key: string;
      name: string;
      sectionCode: string;
      fieldType: 'NUMBER' | 'DATE' | 'BOOLEAN' | 'TEXT';
      unit?: string;
      sortOrder: number;
      isRequired?: boolean;
    }[] = [
      // 1. Классификаторы
      { key: 'decimal_number', name: 'Децимальный номер', sectionCode: 'classifiers', fieldType: 'TEXT', sortOrder: 1 },
      { key: 'okof_code', name: 'Код по ОКОФ (ОК 013-2014)', sectionCode: 'classifiers', fieldType: 'TEXT', sortOrder: 2 },
      { key: 'okpd2_code', name: 'Код по ОКПД2 (ОК 034-2014)', sectionCode: 'classifiers', fieldType: 'TEXT', sortOrder: 3 },
      { key: 'process_classifier_code', name: 'Код технологического классификатора', sectionCode: 'classifiers', fieldType: 'TEXT', sortOrder: 4 },
      { key: 'equipment_group', name: 'Группа оборудования', sectionCode: 'classifiers', fieldType: 'TEXT', sortOrder: 5, isRequired: true },
      { key: 'equipment_type', name: 'Тип оборудования (Установка)', sectionCode: 'classifiers', fieldType: 'TEXT', sortOrder: 6, isRequired: true },

      // 2. Состояние, износ и критичность
      { key: 'country_origin', name: 'Страна производитель', sectionCode: 'condition_wear', fieldType: 'TEXT', sortOrder: 1 },
      { key: 'prod_year', name: 'Год выпуска', sectionCode: 'condition_wear', fieldType: 'NUMBER', sortOrder: 2 },
      { key: 'comm_year', name: 'Год ввода', sectionCode: 'condition_wear', fieldType: 'NUMBER', sortOrder: 3 },
      { key: 'equipment_age', name: 'Возраст оборудования', sectionCode: 'condition_wear', fieldType: 'NUMBER', unit: 'лет', sortOrder: 4 },
      { key: 'actual_wear_percentage', name: 'Фактический процент износа', sectionCode: 'condition_wear', fieldType: 'NUMBER', unit: '%', sortOrder: 5 },
      { key: 'criticality', name: 'Категория критичности', sectionCode: 'condition_wear', fieldType: 'TEXT', sortOrder: 6, isRequired: true },
      { key: 'clean_room_class', name: 'Класс чистоты помещения (ISO)', sectionCode: 'condition_wear', fieldType: 'TEXT', sortOrder: 7 },
      { key: 'is_unique', name: 'Уникальное / единичное оборудование', sectionCode: 'condition_wear', fieldType: 'BOOLEAN', sortOrder: 8 },
      { key: 'is_imported', name: 'Импортное оборудование', sectionCode: 'condition_wear', fieldType: 'BOOLEAN', sortOrder: 9 },

      // 3. Регламент ТОиР и график обслуживания
      { key: 'maintenance_periodicity', name: 'Периодичность регламентного ТО', sectionCode: 'maintenance_regulations', fieldType: 'TEXT', sortOrder: 1, isRequired: true },
      { key: 'maintenance_schedule_year', name: 'Утвержденный график ТО на 2026 год', sectionCode: 'maintenance_regulations', fieldType: 'TEXT', sortOrder: 2 },
      { key: 'to_count_scheduled', name: 'Количество ТО по графику', sectionCode: 'maintenance_regulations', fieldType: 'NUMBER', sortOrder: 3 },
      { key: 'responsible_person_name', name: 'Ответственное лицо (ФИО / Должность)', sectionCode: 'maintenance_regulations', fieldType: 'TEXT', sortOrder: 4, isRequired: true },
      { key: 'external_system_id', name: 'Идентификатор в 1С:Предприятие', sectionCode: 'maintenance_regulations', fieldType: 'TEXT', sortOrder: 5 },

      // 4. Электротехнические параметры
      { key: 'operating_voltage', name: 'Рабочее напряжение питания', sectionCode: 'electrical', fieldType: 'TEXT', sortOrder: 1 },
      { key: 'power_kw', name: 'Потребляемая мощность', sectionCode: 'electrical', fieldType: 'NUMBER', unit: 'кВт', sortOrder: 2 },
      { key: 'nominal_current', name: 'Номинальный рабочий ток', sectionCode: 'electrical', fieldType: 'NUMBER', unit: 'А', sortOrder: 3 },
      { key: 'phase_count', name: 'Количество фаз электросети', sectionCode: 'electrical', fieldType: 'TEXT', sortOrder: 4 },
      { key: 'ups_required', name: 'Требование подключения через ИБП', sectionCode: 'electrical', fieldType: 'TEXT', sortOrder: 5 },

      // 5. Механика, гидравлика и среда
      { key: 'operating_pressure', name: 'Рабочее давление системы', sectionCode: 'mechanics', fieldType: 'NUMBER', unit: 'МПа', sortOrder: 1 },
      { key: 'coolant_type', name: 'Тип смазочного материала / хладагента', sectionCode: 'mechanics', fieldType: 'TEXT', sortOrder: 2 },
      { key: 'rotation_speed', name: 'Частота вращения вала / ротора', sectionCode: 'mechanics', fieldType: 'NUMBER', unit: 'об/мин', sortOrder: 3 },

      // 6. Эксплуатационные требования и метрология
      { key: 'is_critical_path', name: 'Влияет на непрерывность процесса', sectionCode: 'operational', fieldType: 'BOOLEAN', sortOrder: 1 },
      { key: 'calibration_interval', name: 'Периодичность поверки датчиков', sectionCode: 'operational', fieldType: 'NUMBER', unit: 'мес.', sortOrder: 2 },
    ];

    // Standard Sections Definition
    const standardSections = [
      { code: 'classifiers', name: 'Общероссийские и отраслевые классификаторы', description: 'Коды ОКОФ (ОК 013-2014), ОКПД2, классификаторы техпроцесса и децимальные номера', icon: 'Category', sortOrder: 1 },
      { code: 'condition_wear', name: 'Техническое состояние, износ и критичность', description: 'Процент износа, критичность для производства, класс чистоты ISO, признаки уникальности и импорта', icon: 'Speed', sortOrder: 2 },
      { code: 'maintenance_regulations', name: 'Регламент ТОиР и график обслуживания', description: 'Периодичность ТО, график на текущий год, ответственные лица и связь с 1С', icon: 'Shield', sortOrder: 3 },
      { code: 'electrical', name: 'Электротехнические параметры', description: 'Характеристики электропитания, мощности, напряжения и фазности', icon: 'Bolt', sortOrder: 4 },
      { code: 'mechanics', name: 'Механика, гидравлика и среда', description: 'Рабочие среды, давление, обороты и смазочные материалы', icon: 'WaterDrop', sortOrder: 5 },
      { code: 'operational', name: 'Эксплуатационные требования и метрология', description: 'Непрерывность процесса, поверки датчиков и регламентные условия', icon: 'Straighten', sortOrder: 6 },
    ];

    // Bootstrap only an empty catalog and only for a manager. Never reset an
    // existing catalog or migrate equipment data as a side effect of GET.
    if (sections.length === 0 && hasPermission(user, PERMISSIONS.EPS_CUSTOM_FIELDS_MANAGE)) {
      for (const s of standardSections) {
        await prisma.customSection.upsert({
          where: { code: s.code },
          create: s,
          update: { name: s.name, description: s.description, icon: s.icon, sortOrder: s.sortOrder },
        });
      }

      const allBootSections = await prisma.customSection.findMany();
      const bootSecMap = new Map(allBootSections.map((s) => [s.code, s.id]));

      for (const spec of CANONICAL_SPECS) {
        const secId = bootSecMap.get(spec.sectionCode);
        if (secId) {
          await prisma.customFieldDefinition.upsert({
            where: { key: spec.key },
            create: {
              key: spec.key,
              name: spec.name,
              fieldType: spec.fieldType,
              unit: spec.unit,
              sectionId: secId,
              sortOrder: spec.sortOrder,
              isRequired: Boolean(spec.isRequired),
            },
            update: {
              name: spec.name,
              fieldType: spec.fieldType,
              unit: spec.unit,
              sectionId: secId,
              sortOrder: spec.sortOrder,
              isRequired: Boolean(spec.isRequired),
            },
          });
        }
      }

      await prisma.systemSetting.upsert({
        where: { key: 'eps_custom_sections_bootstrapped' },
        create: {
          key: 'eps_custom_sections_bootstrapped',
          value: 'true',
          description: 'EPS custom sections initial bootstrap completed',
        },
        update: { value: 'true' },
      });
    }

    // Alias and duplicate dictionary for automatic merging and cleanup
    const DUPLICATE_TO_CANONICAL: Record<string, string> = {
      // Classifiers duplicates
      kod_okof_2: 'okof_code',
      kod_po_okof_ok_013_2014: 'okof_code',
      kod_po_okof: 'okof_code',
      okof: 'okof_code',
      kod_okpd_2: 'okpd2_code',
      kod_po_okpd2_ok_034_2014: 'okpd2_code',
      kod_po_okpd2: 'okpd2_code',
      okpd2: 'okpd2_code',
      kod_tehnologicheskogo_klassifikatora: 'process_classifier_code',
      klassifikator_tehprotsessa_kod: 'process_classifier_code',
      klassifikator_tehprotsessa: 'process_classifier_code',
      tehnologicheskiy_klassifikator: 'process_classifier_code',
      detsimalnyy_nomer: 'decimal_number',
      detsimalnyy_no: 'decimal_number',
      gruppa_oborudovaniya: 'equipment_group',
      kompleks_gruppa: 'equipment_group',
      kompleks: 'equipment_group',
      tip_oborudovaniya_ustanovka: 'equipment_type',
      tip_oborudovaniya: 'equipment_type',
      ustanovka: 'equipment_type',

      // Condition, Wear & Criticality duplicates
      kategoriya_kritichnosti: 'criticality',
      kritichnost: 'criticality',
      fakticheskiy_protsent_iznosa: 'actual_wear_percentage',
      fakticheskiy_iznos: 'actual_wear_percentage',
      protsent_iznosa: 'actual_wear_percentage',
      iznos: 'actual_wear_percentage',
      klass_chistoty_pomescheniya_iso: 'clean_room_class',
      klass_chistoty_pomescheniya: 'clean_room_class',
      klass_chistoty_iso: 'clean_room_class',
      klass_chistoty: 'clean_room_class',
      unikalnoe_edinichnoe_oborudovanie: 'is_unique',
      unikalnoe_oborudovanie: 'is_unique',
      unikal_noe_oborudovanie: 'is_unique',
      priznak_unikalnosti: 'is_unique',
      importnoe_oborudovanie: 'is_imported',
      import_noe_oborudovanie: 'is_imported',
      priznak_importa: 'is_imported',
      strana_proizvoditel: 'country_origin',
      strana_proishozhdeniya: 'country_origin',
      strana: 'country_origin',
      god_vypuska: 'prod_year',
      god_proizvodstva: 'prod_year',
      god_vvoda: 'comm_year',
      god_vvoda_v_ekspluatatsiyu: 'comm_year',
      vozrast_oborudovaniya: 'equipment_age',
      vozrast: 'equipment_age',

      // Maintenance & Regulations duplicates
      periodichnost_reglamentnogo_to: 'maintenance_periodicity',
      periodichnost_tehnicheskogo_obsluzhivaniya: 'maintenance_periodicity',
      periodichnost_to: 'maintenance_periodicity',
      reglament_to: 'maintenance_periodicity',
      utverzhdennyy_grafik_to_na_2026_god: 'maintenance_schedule_year',
      tehnicheskoe_obsluzhivanie_2026: 'maintenance_schedule_year',
      utverzhdennyy_grafik_to: 'maintenance_schedule_year',
      grafik_to_na_2026_god: 'maintenance_schedule_year',
      grafik_to: 'maintenance_schedule_year',
      kolichestvo_to_po_grafiku: 'to_count_scheduled',
      kol_vo_to_po_grafiku: 'to_count_scheduled',
      kolichestvo_to: 'to_count_scheduled',
      otvetstvennoe_litso_fio_dolzhnost: 'responsible_person_name',
      otvetstvennyy: 'responsible_person_name',
      otvetstvennoe_litso: 'responsible_person_name',
      fio_otvetstvennogo: 'responsible_person_name',
      identifikator_vo_vneshney_sisteme_1s_erp: 'external_system_id',
      identifikator_vo_vneshney_sisteme: 'external_system_id',
      kod_1s_erp: 'external_system_id',
      kod_1s: 'external_system_id',

      // Electrical duplicates
      rabochee_napryazhenie: 'operating_voltage',
      napryazhenie_pitaniya: 'operating_voltage',
      napryazhenie: 'operating_voltage',
      nominalnaya_moschnost: 'power_kw',
      moschnost: 'power_kw',
      nominalnyy_tok: 'nominal_current',
      tok: 'nominal_current',
      kolichestvo_faz: 'phase_count',
      faznost: 'phase_count',
      trebovanie_k_nalichiyu_ibp: 'ups_required',
      nalichie_ibp: 'ups_required',
      ibp: 'ups_required',

      // Mechanics duplicates
      rabochee_davlenie: 'operating_pressure',
      davlenie: 'operating_pressure',
      tip_smazki_hladagenta: 'coolant_type',
      tip_smazki: 'coolant_type',
      hladagent: 'coolant_type',
      smazka: 'coolant_type',
      chastota_vrascheniya_vala: 'rotation_speed',
      chastota_vrascheniya: 'rotation_speed',
      skorost_vrascheniya: 'rotation_speed',
      oboroty: 'rotation_speed',

      // Operational & Metrology duplicates
      vliyaet_na_nepreryvnost_protsessa: 'is_critical_path',
      nepreryvnost_protsessa: 'is_critical_path',
      periodichnost_poverki_datchikov: 'calibration_interval',
      poverka_datchikov: 'calibration_interval',
      interval_poverki: 'calibration_interval',
    };

    sections = await prisma.customSection.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        fields: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка GET /api/eps/custom-sections:', message);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера', details: message }, { status: 500 });
  }
}

// POST: Создание нового технического раздела
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка POST /api/eps/custom-sections:', message);
    return NextResponse.json({ success: false, error: message || 'Ошибка сервера', details: message }, { status: 500 });
  }
}

// PATCH: Редактирование существующего технического раздела
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка PATCH /api/eps/custom-sections:', message);
    return NextResponse.json({ success: false, error: 'Ошибка обновления раздела', details: message }, { status: 500 });
  }
}

// DELETE: Удаление технического раздела
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    if (!hasPermission(user, PERMISSIONS.EPS_CUSTOM_FIELDS_MANAGE) && !hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE)) {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const deleteFields = searchParams.get('deleteFields') !== 'false';

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID раздела обязателен' }, { status: 400 });
    }

    // By default delete child fields associated with this section
    if (deleteFields) {
      await prisma.customFieldDefinition.deleteMany({
        where: { sectionId: id },
      });
    } else {
      await prisma.customFieldDefinition.updateMany({
        where: { sectionId: id },
        data: { sectionId: null },
      });
    }

    const deleted = await prisma.customSection.delete({
      where: { id },
    });

    await logAuditEvent({
      userId: user.userId,
      action: 'DELETE',
      entityType: 'CustomSection',
      entityId: id,
      changes: { deletedName: deleted.name, deleteFields },
    });

    return NextResponse.json({ success: true, message: 'Раздел удален' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка DELETE /api/eps/custom-sections:', message);
    return NextResponse.json({ success: false, error: message || 'Ошибка удаления раздела', details: message }, { status: 500 });
  }
}
