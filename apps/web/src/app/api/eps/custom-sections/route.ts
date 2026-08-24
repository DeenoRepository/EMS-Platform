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

    // Ensure standard sections exist
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

    const allSections = await prisma.customSection.findMany();
    const secMap = new Map(allSections.map((s) => [s.code, s.id]));

    // Auto-migrate any transliterated keys to proper English keys
    const TRANSLIT_TO_ENGLISH_RENAME: Record<string, { key: string; name: string; sectionCode: string; unit?: string }> = {
      kod_po_okof_ok_013_2014: { key: 'okof_code', name: 'Код по ОКОФ (ОК 013-2014)', sectionCode: 'classifiers' },
      kod_po_okof: { key: 'okof_code', name: 'Код по ОКОФ (ОК 013-2014)', sectionCode: 'classifiers' },
      kod_po_okpd2_ok_034_2014: { key: 'okpd2_code', name: 'Код по ОКПД2 (ОК 034-2014)', sectionCode: 'classifiers' },
      kod_po_okpd2: { key: 'okpd2_code', name: 'Код по ОКПД2 (ОК 034-2014)', sectionCode: 'classifiers' },
      kod_tehnologicheskogo_klassifikatora: { key: 'process_classifier_code', name: 'Код технологического классификатора', sectionCode: 'classifiers' },
      detsimalnyy_nomer: { key: 'decimal_number', name: 'Децимальный номер', sectionCode: 'classifiers' },
      gruppa_oborudovaniya: { key: 'equipment_group', name: 'Группа оборудования', sectionCode: 'classifiers' },
      tip_oborudovaniya_ustanovka: { key: 'equipment_type', name: 'Тип оборудования (Установка)', sectionCode: 'classifiers' },
      tip_oborudovaniya: { key: 'equipment_type', name: 'Тип оборудования (Установка)', sectionCode: 'classifiers' },
      kategoriya_kritichnosti: { key: 'criticality', name: 'Категория критичности', sectionCode: 'condition_wear' },
      kritichnost: { key: 'criticality', name: 'Категория критичности', sectionCode: 'condition_wear' },
      fakticheskiy_protsent_iznosa: { key: 'actual_wear_percentage', name: 'Фактический процент износа', sectionCode: 'condition_wear', unit: '%' },
      protsent_iznosa: { key: 'actual_wear_percentage', name: 'Фактический процент износа', sectionCode: 'condition_wear', unit: '%' },
      iznos: { key: 'actual_wear_percentage', name: 'Фактический процент износа', sectionCode: 'condition_wear', unit: '%' },
      klass_chistoty_pomescheniya_iso: { key: 'clean_room_class', name: 'Класс чистоты помещения (ISO)', sectionCode: 'condition_wear' },
      klass_chistoty: { key: 'clean_room_class', name: 'Класс чистоты помещения (ISO)', sectionCode: 'condition_wear' },
      unikalnoe_edinichnoe_oborudovanie: { key: 'is_unique', name: 'Уникальное / единичное оборудование', sectionCode: 'condition_wear' },
      unikalnoe_oborudovanie: { key: 'is_unique', name: 'Уникальное / единичное оборудование', sectionCode: 'condition_wear' },
      importnoe_oborudovanie: { key: 'is_imported', name: 'Импортное оборудование', sectionCode: 'condition_wear' },
      strana_proizvoditel: { key: 'country_origin', name: 'Страна производитель', sectionCode: 'condition_wear' },
      god_vypuska: { key: 'prod_year', name: 'Год выпуска', sectionCode: 'condition_wear' },
      god_vvoda: { key: 'comm_year', name: 'Год ввода', sectionCode: 'condition_wear' },
      vozrast_oborudovaniya: { key: 'equipment_age', name: 'Возраст оборудования', sectionCode: 'condition_wear', unit: 'лет' },
      periodichnost_reglamentnogo_to: { key: 'maintenance_periodicity', name: 'Периодичность регламентного ТО', sectionCode: 'maintenance_regulations' },
      periodichnost_to: { key: 'maintenance_periodicity', name: 'Периодичность регламентного ТО', sectionCode: 'maintenance_regulations' },
      utverzhdennyy_grafik_to_na_2026_god: { key: 'maintenance_schedule_year', name: 'Утвержденный график ТО на 2026 год', sectionCode: 'maintenance_regulations' },
      utverzhdennyy_grafik_to: { key: 'maintenance_schedule_year', name: 'Утвержденный график ТО на 2026 год', sectionCode: 'maintenance_regulations' },
      kolichestvo_to_po_grafiku: { key: 'to_count_scheduled', name: 'Количество ТО по графику', sectionCode: 'maintenance_regulations' },
      kolichestvo_to: { key: 'to_count_scheduled', name: 'Количество ТО по графику', sectionCode: 'maintenance_regulations' },
      otvetstvennoe_litso_fio_dolzhnost: { key: 'responsible_person_name', name: 'Ответственное лицо (ФИО / Должность)', sectionCode: 'maintenance_regulations' },
      otvetstvennoe_litso: { key: 'responsible_person_name', name: 'Ответственное лицо (ФИО / Должность)', sectionCode: 'maintenance_regulations' },
      identifikator_vo_vneshney_sisteme_1s_erp: { key: 'external_system_id', name: 'Идентификатор во внешней системе (1С / ERP)', sectionCode: 'maintenance_regulations' },
      rabochee_napryazhenie: { key: 'operating_voltage', name: 'Рабочее напряжение', sectionCode: 'electrical' },
      nominalnaya_moschnost: { key: 'power_kw', name: 'Номинальная мощность', sectionCode: 'electrical', unit: 'кВт' },
      nominalnyy_tok: { key: 'nominal_current', name: 'Номинальный ток', sectionCode: 'electrical', unit: 'А' },
      kolichestvo_faz: { key: 'phase_count', name: 'Количество фаз', sectionCode: 'electrical' },
      trebovanie_k_nalichiyu_ibp: { key: 'ups_required', name: 'Требование к наличию ИБП', sectionCode: 'electrical' },
      rabochee_davlenie: { key: 'operating_pressure', name: 'Рабочее давление', sectionCode: 'mechanics', unit: 'МПа' },
      tip_smazki_hladagenta: { key: 'coolant_type', name: 'Тип смазки / хладагента', sectionCode: 'mechanics' },
      chastota_vrascheniya_vala: { key: 'rotation_speed', name: 'Частота вращения вала', sectionCode: 'mechanics', unit: 'об/мин' },
      vliyaet_na_nepreryvnost_protsessa: { key: 'is_critical_path', name: 'Влияет на непрерывность процесса', sectionCode: 'operational' },
      periodichnost_poverki_datchikov: { key: 'calibration_interval', name: 'Периодичность поверки датчиков', sectionCode: 'operational', unit: 'мес.' },
    };

    let needsEquipmentJsonUpdate = false;

    for (const [translitKey, target] of Object.entries(TRANSLIT_TO_ENGLISH_RENAME)) {
      const translitDef = await prisma.customFieldDefinition.findUnique({
        where: { key: translitKey },
      });

      if (translitDef) {
        needsEquipmentJsonUpdate = true;
        const targetSecId = secMap.get(target.sectionCode) || translitDef.sectionId;
        const targetDef = await prisma.customFieldDefinition.findUnique({
          where: { key: target.key },
        });

        if (targetDef) {
          // Target already exists, delete the translit definition
          await prisma.customFieldDefinition.delete({ where: { id: translitDef.id } });
        } else {
          // Rename translit definition to proper English key
          await prisma.customFieldDefinition.update({
            where: { id: translitDef.id },
            data: {
              key: target.key,
              name: target.name,
              sectionId: targetSecId,
              unit: target.unit || translitDef.unit,
            },
          });
        }
      }
    }

    // Link any remaining orphan fields to sections
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

    // Heuristic contextual assignment for any remaining unassigned custom fields
    const unassignedBefore = await prisma.customFieldDefinition.findMany({
      where: { sectionId: null },
    });

    for (const f of unassignedBefore) {
      const text = `${f.key} ${f.name}`.toLowerCase();
      let targetCode = 'classifiers';

      if (/износ|критичност|чистот|уникальн|импорт|стран|год|возраст|wear|critical|clean|room|iso|unique|import|country|year|age/i.test(text)) {
        targetCode = 'condition_wear';
      } else if (/то|регламент|график|обслуживан|ответствен|1с|erp|maint|sched|period|plan|respons|person|external/i.test(text)) {
        targetCode = 'maintenance_regulations';
      } else if (/напряжен|мощност|ток|фаз|ибп|электр|volt|power|current|amp|watt|phase|ups|electr/i.test(text)) {
        targetCode = 'electrical';
      } else if (/давлен|хладагент|смазк|скорост|механ|гидравлик|оборот|rpm|pressure|coolant|grease|speed|mech|hydr/i.test(text)) {
        targetCode = 'mechanics';
      } else if (/непрерывн|поверк|калибровк|датчик|метролог|интервал|calibration|sensor|interval|path/i.test(text)) {
        targetCode = 'operational';
      }

      const secId = secMap.get(targetCode);
      if (secId) {
        await prisma.customFieldDefinition.update({
          where: { id: f.id },
          data: { sectionId: secId },
        });
      }
    }

    // Migrate equipment JSON customFields if needed
    if (needsEquipmentJsonUpdate) {
      try {
        const equipments = await prisma.equipment.findMany({
          select: { id: true, customFields: true },
        });

        for (const eq of equipments) {
          const cf = eq.customFields as Record<string, any>;
          if (cf && typeof cf === 'object') {
            let modified = false;
            for (const [oldKey, target] of Object.entries(TRANSLIT_TO_ENGLISH_RENAME)) {
              if (cf[oldKey] !== undefined) {
                if (cf[target.key] === undefined) {
                  cf[target.key] = cf[oldKey];
                }
                delete cf[oldKey];
                modified = true;
              }
            }
            if (modified) {
              await prisma.equipment.update({
                where: { id: eq.id },
                data: { customFields: cf },
              });
            }
          }
        }
      } catch (err) {
        console.error('Ошибка миграции customFields в Equipment:', err);
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
