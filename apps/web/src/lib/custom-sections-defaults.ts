import { prisma } from '@ems/database';

export const STANDARD_SECTIONS = [
  { code: 'classifiers', name: 'Общероссийские и отраслевые классификаторы', description: 'Коды ОКОФ (ОК 013-2014), ОКПД2, классификаторы техпроцесса и децимальные номера', icon: 'Category', sortOrder: 1 },
  { code: 'condition_wear', name: 'Техническое состояние, износ и критичность', description: 'Процент износа, критичность для производства, класс чистоты ISO, признаки уникальности и импорта', icon: 'Speed', sortOrder: 2 },
  { code: 'maintenance_regulations', name: 'Регламент ТОиР и график обслуживания', description: 'Периодичность ТО, график на текущий год, ответственные лица и связь с 1С', icon: 'Shield', sortOrder: 3 },
  { code: 'electrical', name: 'Электротехнические параметры', description: 'Характеристики электропитания, мощности, напряжения и фазности', icon: 'Bolt', sortOrder: 4 },
  { code: 'mechanics', name: 'Механика, гидравлика и среда', description: 'Рабочие среды, давление, обороты и смазочные материалы', icon: 'WaterDrop', sortOrder: 5 },
  { code: 'operational', name: 'Эксплуатационные требования и метрология', description: 'Непрерывность процесса, поверки датчиков и регламентные условия', icon: 'Straighten', sortOrder: 6 },
];

export const CANONICAL_SPECS: { key: string; name: string; sectionCode: string; fieldType: 'NUMBER' | 'DATE' | 'BOOLEAN' | 'TEXT'; unit?: string; sortOrder: number }[] = [
  // 1. Классификаторы
  { key: 'decimal_number', name: 'Децимальный номер', sectionCode: 'classifiers', fieldType: 'TEXT', sortOrder: 1 },
  { key: 'okof_code', name: 'Код по ОКОФ (ОК 013-2014)', sectionCode: 'classifiers', fieldType: 'TEXT', sortOrder: 2 },
  { key: 'okpd2_code', name: 'Код по ОКПД2 (ОК 034-2014)', sectionCode: 'classifiers', fieldType: 'TEXT', sortOrder: 3 },
  { key: 'process_classifier_code', name: 'Код технологического классификатора', sectionCode: 'classifiers', fieldType: 'TEXT', sortOrder: 4 },
  { key: 'equipment_group', name: 'Группа оборудования', sectionCode: 'classifiers', fieldType: 'TEXT', sortOrder: 5 },
  { key: 'equipment_type', name: 'Тип оборудования (Установка)', sectionCode: 'classifiers', fieldType: 'TEXT', sortOrder: 6 },

  // 2. Состояние, износ и критичность
  { key: 'country_origin', name: 'Страна производитель', sectionCode: 'condition_wear', fieldType: 'TEXT', sortOrder: 1 },
  { key: 'prod_year', name: 'Год выпуска', sectionCode: 'condition_wear', fieldType: 'NUMBER', sortOrder: 2 },
  { key: 'comm_year', name: 'Год ввода', sectionCode: 'condition_wear', fieldType: 'NUMBER', sortOrder: 3 },
  { key: 'equipment_age', name: 'Возраст оборудования', sectionCode: 'condition_wear', fieldType: 'NUMBER', unit: 'лет', sortOrder: 4 },
  { key: 'actual_wear_percentage', name: 'Фактический процент износа', sectionCode: 'condition_wear', fieldType: 'NUMBER', unit: '%', sortOrder: 5 },
  { key: 'criticality', name: 'Категория критичности', sectionCode: 'condition_wear', fieldType: 'TEXT', sortOrder: 6 },
  { key: 'clean_room_class', name: 'Класс чистоты помещения (ISO)', sectionCode: 'condition_wear', fieldType: 'TEXT', sortOrder: 7 },
  { key: 'is_unique', name: 'Уникальное / единичное оборудование', sectionCode: 'condition_wear', fieldType: 'BOOLEAN', sortOrder: 8 },
  { key: 'is_imported', name: 'Импортное оборудование', sectionCode: 'condition_wear', fieldType: 'BOOLEAN', sortOrder: 9 },

  // 3. Регламент ТОиР и график обслуживания
  { key: 'maintenance_periodicity', name: 'Периодичность регламентного ТО', sectionCode: 'maintenance_regulations', fieldType: 'TEXT', sortOrder: 1 },
  { key: 'maintenance_schedule_year', name: 'Утвержденный график ТО на 2026 год', sectionCode: 'maintenance_regulations', fieldType: 'TEXT', sortOrder: 2 },
  { key: 'to_count_scheduled', name: 'Количество ТО по графику', sectionCode: 'maintenance_regulations', fieldType: 'NUMBER', sortOrder: 3 },
  { key: 'responsible_person_name', name: 'Ответственное лицо (ФИО / Должность)', sectionCode: 'maintenance_regulations', fieldType: 'TEXT', sortOrder: 4 },
  { key: 'external_system_id', name: 'Идентификатор во внешней системе (1С / ERP)', sectionCode: 'maintenance_regulations', fieldType: 'TEXT', sortOrder: 5 },

  // 4. Электротехнические параметры
  { key: 'operating_voltage', name: 'Рабочее напряжение', sectionCode: 'electrical', fieldType: 'TEXT', sortOrder: 1 },
  { key: 'power_kw', name: 'Номинальная мощность', sectionCode: 'electrical', fieldType: 'NUMBER', unit: 'кВт', sortOrder: 2 },
  { key: 'nominal_current', name: 'Номинальный ток', sectionCode: 'electrical', fieldType: 'NUMBER', unit: 'А', sortOrder: 3 },
  { key: 'phase_count', name: 'Количество фаз', sectionCode: 'electrical', fieldType: 'NUMBER', sortOrder: 4 },
  { key: 'ups_required', name: 'Требование к наличию ИБП', sectionCode: 'electrical', fieldType: 'TEXT', sortOrder: 5 },

  // 5. Механика, гидравлика и среда
  { key: 'operating_pressure', name: 'Рабочее давление', sectionCode: 'mechanics', fieldType: 'NUMBER', unit: 'МПа', sortOrder: 1 },
  { key: 'coolant_type', name: 'Тип смазки / хладагента', sectionCode: 'mechanics', fieldType: 'TEXT', sortOrder: 2 },
  { key: 'rotation_speed', name: 'Частота вращения вала', sectionCode: 'mechanics', fieldType: 'NUMBER', unit: 'об/мин', sortOrder: 3 },

  // 6. Эксплуатационные требования и метрология
  { key: 'is_critical_path', name: 'Влияет на непрерывность процесса', sectionCode: 'operational', fieldType: 'BOOLEAN', sortOrder: 1 },
  { key: 'calibration_interval', name: 'Периодичность поверки датчиков', sectionCode: 'operational', fieldType: 'NUMBER', unit: 'мес.', sortOrder: 2 },
];

export const DUPLICATE_TO_CANONICAL: Record<string, string> = {
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
  vliyaet_na_nepreryvnost_protsessa: 'is_critical_path',
  nepreryvnost_protsessa: 'is_critical_path',
  periodichnost_poverki_datchikov: 'calibration_interval',
  poverka_datchikov: 'calibration_interval',
  interval_poverki: 'calibration_interval',
};

export const BASE_MODEL_DUPLICATE_KEYS = [
  'zavodskoy_nomer',
  'zavodskoy_no',
  'zavodskoy_num',
  'serial_number',
  'serialnumber',
  'raspolozhenie_ulitsa_korpus_etazh_uchastok',
  'raspolozhenie',
  'location',
  'mesto_ustanovki',
  'inventarnyy_nomer',
  'inventarnyy_no',
  'inventory_number',
  'inventorynumber',
  'naimenovanie_oborudovaniya',
  'naimenovanie',
  'name',
  'proizvoditel',
  'manufacturer',
  'model_modifikatsiya',
  'model',
  'data_vvoda_v_ekspluatatsiyu',
  'data_vvoda',
  'commission_date',
];

export async function bootstrapStandardCustomSections(): Promise<void> {
  const sections = await prisma.customSection.findMany();
  if (sections.length === 0) {
    for (const s of STANDARD_SECTIONS) {
      await prisma.customSection.upsert({
        where: { code: s.code },
        create: s,
        update: { name: s.name, description: s.description, icon: s.icon, sortOrder: s.sortOrder },
      });
    }
  }

  const allSections = await prisma.customSection.findMany();
  const secMap = new Map(allSections.map((s) => [s.code, s.id]));

  // 1. Delete all base model duplicate custom field definitions
  await prisma.customFieldDefinition.deleteMany({
    where: { key: { in: BASE_MODEL_DUPLICATE_KEYS } },
  });

  // 2. Delete all duplicate/transliterated custom field definitions
  await prisma.customFieldDefinition.deleteMany({
    where: { key: { in: Object.keys(DUPLICATE_TO_CANONICAL) } },
  });

  // 3. Ensure all 26 Canonical Field Definitions exist and are correctly bound to their sections
  for (const spec of CANONICAL_SPECS) {
    const secId = secMap.get(spec.sectionCode);
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
        },
        update: {
          name: spec.name,
          fieldType: spec.fieldType,
          unit: spec.unit,
          sectionId: secId,
          sortOrder: spec.sortOrder,
        },
      });
    }
  }
}

export async function migrateEquipmentCustomFields(): Promise<void> {
  try {
    const equipments = await prisma.equipment.findMany({
      select: { id: true, serialNumber: true, location: true, customFields: true },
    });

    for (const eq of equipments) {
      const cf = eq.customFields as Record<string, any>;
      if (cf && typeof cf === 'object') {
        let modified = false;
        let updatedSerial = eq.serialNumber;
        let updatedLocation = eq.location;

        // Migrate base field duplicates if model fields are empty
        if (!updatedSerial && (cf.zavodskoy_nomer || cf.serial_number)) {
          updatedSerial = String(cf.zavodskoy_nomer || cf.serial_number);
        }
        if (!updatedLocation && (cf.raspolozhenie_ulitsa_korpus_etazh_uchastok || cf.raspolozhenie)) {
          updatedLocation = String(cf.raspolozhenie_ulitsa_korpus_etazh_uchastok || cf.raspolozhenie);
        }

        // Remove base model duplicates from customFields
        for (const k of BASE_MODEL_DUPLICATE_KEYS) {
          if (cf[k] !== undefined) {
            delete cf[k];
            modified = true;
          }
        }

        // Migrate duplicate/translit keys to canonical keys
        for (const [oldKey, canonKey] of Object.entries(DUPLICATE_TO_CANONICAL)) {
          if (cf[oldKey] !== undefined) {
            if (cf[canonKey] === undefined) {
              cf[canonKey] = cf[oldKey];
            }
            delete cf[oldKey];
            modified = true;
          }
        }

        if (modified || updatedSerial !== eq.serialNumber || updatedLocation !== eq.location) {
          await prisma.equipment.update({
            where: { id: eq.id },
            data: {
              customFields: cf,
              serialNumber: updatedSerial,
              location: updatedLocation,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('Ошибка миграции customFields в Equipment:', err);
  }
}
