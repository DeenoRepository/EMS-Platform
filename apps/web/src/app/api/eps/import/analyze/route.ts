import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface ColumnMatchRule {
  targetKey: string;
  targetName: string;
  aliases: string[];
}

const KNOWN_BASE_FIELDS: ColumnMatchRule[] = [
  {
    targetKey: 'name',
    targetName: 'Наименование оборудования',
    aliases: [
      'наименование оборудования', 'название оборудования', 'наименование', 'название',
      'наименование актива', 'название актива', 'наименование объекта',
      'name', 'title', 'equipment name', 'equipment_name'
    ],
  },
  {
    targetKey: 'inventoryNumber',
    targetName: 'Инвентарный номер',
    aliases: ['инвентарный номер', 'инвентарный №', 'инвентарный no', 'инвентарный', 'инв. номер', 'инв номер', 'инв. №', 'инв №', 'инв.', 'инв', 'inventorynumber', 'inventory number', 'inv number', 'inv no'],
  },
  {
    targetKey: 'serialNumber',
    targetName: 'Заводской / Серийный номер',
    aliases: [
      'заводской / серийный номер', 'заводской / серийный №', 'заводской/серийный номер', 'заводской/серийный №',
      'заводской номер', 'серийный номер', 'заводской №', 'заводской no', 'заводской', 'зав. номер', 'зав. №', 'зав №', 'зав.',
      'серийный №', 'серийный no', 'серийный', 'serialnumber', 'serial number', 'serial', 'sn'
    ],
  },
  {
    targetKey: 'manufacturer',
    targetName: 'Производитель',
    aliases: ['наименование производителя', 'производитель', 'изготовитель', 'бренд', 'завод-изготовитель', 'завод изготовитель', 'вендор', 'производитель / бренд', 'страна / производитель', 'manufacturer', 'vendor', 'brand', 'make'],
  },
  {
    targetKey: 'model',
    targetName: 'Модель / Модификация',
    aliases: ['модель / модификация', 'модель/модификация', 'модель модификация', 'модель', 'модификация', 'марка', 'model', 'type'],
  },
  {
    targetKey: 'location',
    targetName: 'Место установки (Локация)',
    aliases: [
      'расположение (улица, корпус, этаж, участок)', 'расположение улица, корпус, этаж, участок', 'расположение улица корпус этаж участок',
      'место установки (локация)', 'место установки', 'расположение', 'локация', 'цех', 'участок', 'местоположение', 'помещение',
      'location', 'site', 'placement'
    ],
  },
  {
    targetKey: 'status',
    targetName: 'Рабочий статус',
    aliases: ['рабочий статус', 'статус', 'состояние', 'текущий статус', 'status', 'state'],
  },
  {
    targetKey: 'commissionDate',
    targetName: 'Дата ввода в эксплуатацию',
    aliases: ['дата ввода в эксплуатацию', 'дата ввода', 'ввод в эксплуатацию', 'дата запуска', 'commissiondate', 'commission date', 'installation date'],
  },
  {
    targetKey: 'tags',
    targetName: 'Теги / Классификаторы',
    aliases: ['теги / классификаторы', 'теги', 'классификаторы', 'категории', 'метки', 'tags', 'categories', 'labels'],
  },
];

function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .replace(/[*[\]()/,\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function guessFieldType(values: any[]): 'NUMBER' | 'DATE' | 'BOOLEAN' | 'TEXT' {
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonEmpty.length === 0) return 'TEXT';

  // Check boolean
  const isAllBool = nonEmpty.every((v) => {
    const s = String(v).toLowerCase().trim();
    return ['true', 'false', 'да', 'нет', '1', '0', 'yes', 'no'].includes(s);
  });
  if (isAllBool) return 'BOOLEAN';

  // Check number
  const isAllNum = nonEmpty.every((v) => {
    const s = String(v).trim().replace(',', '.');
    return !isNaN(Number(s));
  });
  if (isAllNum) return 'NUMBER';

  // Check date
  const isAllDate = nonEmpty.every((v) => {
    const s = String(v).trim();
    const d = new Date(s);
    return !isNaN(d.getTime()) && s.length >= 8 && /\d/.test(s);
  });
  if (isAllDate) return 'DATE';

  return 'TEXT';
}

const CANONICAL_FIELD_DICTIONARY: Record<string, { key: string; name: string; sectionCode: string; fieldType?: 'NUMBER' | 'DATE' | 'BOOLEAN' | 'TEXT'; unit?: string }> = {
  // 1. Классификаторы
  'децимальный номер': { key: 'decimal_number', name: 'Децимальный номер', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'код по окоф ок 013 2014': { key: 'okof_code', name: 'Код по ОКОФ (ОК 013-2014)', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'код по окоф': { key: 'okof_code', name: 'Код по ОКОФ (ОК 013-2014)', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'код окоф 2': { key: 'okof_code', name: 'Код по ОКОФ (ОК 013-2014)', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'окоф': { key: 'okof_code', name: 'Код по ОКОФ (ОК 013-2014)', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'код по окпд2 ок 034 2014': { key: 'okpd2_code', name: 'Код по ОКПД2 (ОК 034-2014)', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'код по окпд2': { key: 'okpd2_code', name: 'Код по ОКПД2 (ОК 034-2014)', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'код окпд 2': { key: 'okpd2_code', name: 'Код по ОКПД2 (ОК 034-2014)', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'окпд2': { key: 'okpd2_code', name: 'Код по ОКПД2 (ОК 034-2014)', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'код технологического классификатора': { key: 'process_classifier_code', name: 'Код технологического классификатора', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'классификатор техпроцесса код': { key: 'process_classifier_code', name: 'Код технологического классификатора', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'классификатор техпроцесса': { key: 'process_classifier_code', name: 'Код технологического классификатора', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'технологический классификатор': { key: 'process_classifier_code', name: 'Код технологического классификатора', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'группа оборудования': { key: 'equipment_group', name: 'Группа оборудования', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'комплекс группа': { key: 'equipment_group', name: 'Группа оборудования', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'комплекс': { key: 'equipment_group', name: 'Группа оборудования', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'тип оборудования установка': { key: 'equipment_type', name: 'Тип оборудования (Установка)', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'тип оборудования': { key: 'equipment_type', name: 'Тип оборудования (Установка)', sectionCode: 'classifiers', fieldType: 'TEXT' },
  'установка': { key: 'equipment_type', name: 'Тип оборудования (Установка)', sectionCode: 'classifiers', fieldType: 'TEXT' },

  // 2. Состояние, износ и критичность
  'страна производитель': { key: 'country_origin', name: 'Страна производитель', sectionCode: 'condition_wear', fieldType: 'TEXT' },
  'страна происхождения': { key: 'country_origin', name: 'Страна производитель', sectionCode: 'condition_wear', fieldType: 'TEXT' },
  'страна': { key: 'country_origin', name: 'Страна производитель', sectionCode: 'condition_wear', fieldType: 'TEXT' },
  'год выпуска': { key: 'prod_year', name: 'Год выпуска', sectionCode: 'condition_wear', fieldType: 'NUMBER' },
  'год производства': { key: 'prod_year', name: 'Год выпуска', sectionCode: 'condition_wear', fieldType: 'NUMBER' },
  'год ввода': { key: 'comm_year', name: 'Год ввода', sectionCode: 'condition_wear', fieldType: 'NUMBER' },
  'год ввода в эксплуатацию': { key: 'comm_year', name: 'Год ввода', sectionCode: 'condition_wear', fieldType: 'NUMBER' },
  'возраст оборудования': { key: 'equipment_age', name: 'Возраст оборудования', sectionCode: 'condition_wear', fieldType: 'NUMBER', unit: 'лет' },
  'возраст': { key: 'equipment_age', name: 'Возраст оборудования', sectionCode: 'condition_wear', fieldType: 'NUMBER', unit: 'лет' },
  'фактический процент износа': { key: 'actual_wear_percentage', name: 'Фактический процент износа', sectionCode: 'condition_wear', fieldType: 'NUMBER', unit: '%' },
  'фактический износ': { key: 'actual_wear_percentage', name: 'Фактический процент износа', sectionCode: 'condition_wear', fieldType: 'NUMBER', unit: '%' },
  'фактический износ %': { key: 'actual_wear_percentage', name: 'Фактический процент износа', sectionCode: 'condition_wear', fieldType: 'NUMBER', unit: '%' },
  'процент износа': { key: 'actual_wear_percentage', name: 'Фактический процент износа', sectionCode: 'condition_wear', fieldType: 'NUMBER', unit: '%' },
  'износ': { key: 'actual_wear_percentage', name: 'Фактический процент износа', sectionCode: 'condition_wear', fieldType: 'NUMBER', unit: '%' },
  'категория критичности': { key: 'criticality', name: 'Категория критичности', sectionCode: 'condition_wear', fieldType: 'TEXT' },
  'критичность': { key: 'criticality', name: 'Категория критичности', sectionCode: 'condition_wear', fieldType: 'TEXT' },
  'класс чистоты помещения iso': { key: 'clean_room_class', name: 'Класс чистоты помещения (ISO)', sectionCode: 'condition_wear', fieldType: 'TEXT' },
  'класс чистоты помещения': { key: 'clean_room_class', name: 'Класс чистоты помещения (ISO)', sectionCode: 'condition_wear', fieldType: 'TEXT' },
  'класс чистоты iso': { key: 'clean_room_class', name: 'Класс чистоты помещения (ISO)', sectionCode: 'condition_wear', fieldType: 'TEXT' },
  'класс чистоты': { key: 'clean_room_class', name: 'Класс чистоты помещения (ISO)', sectionCode: 'condition_wear', fieldType: 'TEXT' },
  'уникальное единичное оборудование': { key: 'is_unique', name: 'Уникальное / единичное оборудование', sectionCode: 'condition_wear', fieldType: 'BOOLEAN' },
  'уникальное оборудование': { key: 'is_unique', name: 'Уникальное / единичное оборудование', sectionCode: 'condition_wear', fieldType: 'BOOLEAN' },
  'признак уникальности': { key: 'is_unique', name: 'Уникальное / единичное оборудование', sectionCode: 'condition_wear', fieldType: 'BOOLEAN' },
  'импортное оборудование': { key: 'is_imported', name: 'Импортное оборудование', sectionCode: 'condition_wear', fieldType: 'BOOLEAN' },
  'признак импорта': { key: 'is_imported', name: 'Импортное оборудование', sectionCode: 'condition_wear', fieldType: 'BOOLEAN' },

  // 3. Регламент ТОиР и график обслуживания
  'периодичность регламентного то': { key: 'maintenance_periodicity', name: 'Периодичность регламентного ТО', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'периодичность технического обслуживания': { key: 'maintenance_periodicity', name: 'Периодичность регламентного ТО', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'периодичность то': { key: 'maintenance_periodicity', name: 'Периодичность регламентного ТО', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'регламент то': { key: 'maintenance_periodicity', name: 'Периодичность регламентного ТО', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'утвержденный график то на 2026 год': { key: 'maintenance_schedule_year', name: 'Утвержденный график ТО на 2026 год', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'техническое обслуживание 2026': { key: 'maintenance_schedule_year', name: 'Утвержденный график ТО на 2026 год', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'утвержденный график то': { key: 'maintenance_schedule_year', name: 'Утвержденный график ТО на 2026 год', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'график то на 2026 год': { key: 'maintenance_schedule_year', name: 'Утвержденный график ТО на 2026 год', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'график то': { key: 'maintenance_schedule_year', name: 'Утвержденный график ТО на 2026 год', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'количество то по графику': { key: 'to_count_scheduled', name: 'Количество ТО по графику', sectionCode: 'maintenance_regulations', fieldType: 'NUMBER' },
  'кол во то по графику': { key: 'to_count_scheduled', name: 'Количество ТО по графику', sectionCode: 'maintenance_regulations', fieldType: 'NUMBER' },
  'колво то по графику': { key: 'to_count_scheduled', name: 'Количество ТО по графику', sectionCode: 'maintenance_regulations', fieldType: 'NUMBER' },
  'количество то': { key: 'to_count_scheduled', name: 'Количество ТО по графику', sectionCode: 'maintenance_regulations', fieldType: 'NUMBER' },
  'ответственное лицо фио должность': { key: 'responsible_person_name', name: 'Ответственное лицо (ФИО / Должность)', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'ответственное лицо': { key: 'responsible_person_name', name: 'Ответственное лицо (ФИО / Должность)', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'ответственный': { key: 'responsible_person_name', name: 'Ответственное лицо (ФИО / Должность)', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'фио ответственного': { key: 'responsible_person_name', name: 'Ответственное лицо (ФИО / Должность)', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'идентификатор во внешней системе 1с erp': { key: 'external_system_id', name: 'Идентификатор во внешней системе (1С / ERP)', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'идентификатор во внешней системе': { key: 'external_system_id', name: 'Идентификатор во внешней системе (1С / ERP)', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'код 1с erp': { key: 'external_system_id', name: 'Идентификатор во внешней системе (1С / ERP)', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },
  'код 1с': { key: 'external_system_id', name: 'Идентификатор во внешней системе (1С / ERP)', sectionCode: 'maintenance_regulations', fieldType: 'TEXT' },

  // 4. Электротехнические параметры
  'рабочее напряжение': { key: 'operating_voltage', name: 'Рабочее напряжение', sectionCode: 'electrical', fieldType: 'TEXT' },
  'напряжение питания': { key: 'operating_voltage', name: 'Рабочее напряжение', sectionCode: 'electrical', fieldType: 'TEXT' },
  'напряжение': { key: 'operating_voltage', name: 'Рабочее напряжение', sectionCode: 'electrical', fieldType: 'TEXT' },
  'номинальная мощность': { key: 'power_kw', name: 'Номинальная мощность', sectionCode: 'electrical', fieldType: 'NUMBER', unit: 'кВт' },
  'мощность': { key: 'power_kw', name: 'Номинальная мощность', sectionCode: 'electrical', fieldType: 'NUMBER', unit: 'кВт' },
  'номинальный ток': { key: 'nominal_current', name: 'Номинальный ток', sectionCode: 'electrical', fieldType: 'NUMBER', unit: 'А' },
  'ток': { key: 'nominal_current', name: 'Номинальный ток', sectionCode: 'electrical', fieldType: 'NUMBER', unit: 'А' },
  'количество фаз': { key: 'phase_count', name: 'Количество фаз', sectionCode: 'electrical', fieldType: 'NUMBER' },
  'фазность': { key: 'phase_count', name: 'Количество фаз', sectionCode: 'electrical', fieldType: 'NUMBER' },
  'требование к наличию ибп': { key: 'ups_required', name: 'Требование к наличию ИБП', sectionCode: 'electrical', fieldType: 'TEXT' },
  'наличие ибп': { key: 'ups_required', name: 'Требование к наличию ИБП', sectionCode: 'electrical', fieldType: 'TEXT' },
  'ибп': { key: 'ups_required', name: 'Требование к наличию ИБП', sectionCode: 'electrical', fieldType: 'TEXT' },

  // 5. Механика, гидравлика и среда
  'рабочее давление': { key: 'operating_pressure', name: 'Рабочее давление', sectionCode: 'mechanics', fieldType: 'NUMBER', unit: 'МПа' },
  'давление': { key: 'operating_pressure', name: 'Рабочее давление', sectionCode: 'mechanics', fieldType: 'NUMBER', unit: 'МПа' },
  'тип смазки хладагента': { key: 'coolant_type', name: 'Тип смазки / хладагента', sectionCode: 'mechanics', fieldType: 'TEXT' },
  'тип смазки': { key: 'coolant_type', name: 'Тип смазки / хладагента', sectionCode: 'mechanics', fieldType: 'TEXT' },
  'хладагент': { key: 'coolant_type', name: 'Тип смазки / хладагента', sectionCode: 'mechanics', fieldType: 'TEXT' },
  'смазка': { key: 'coolant_type', name: 'Тип смазки / хладагента', sectionCode: 'mechanics', fieldType: 'TEXT' },
  'частота вращения вала': { key: 'rotation_speed', name: 'Частота вращения вала', sectionCode: 'mechanics', fieldType: 'NUMBER', unit: 'об/мин' },
  'частота вращения': { key: 'rotation_speed', name: 'Частота вращения вала', sectionCode: 'mechanics', fieldType: 'NUMBER', unit: 'об/мин' },
  'скорость вращения': { key: 'rotation_speed', name: 'Частота вращения вала', sectionCode: 'mechanics', fieldType: 'NUMBER', unit: 'об/мин' },
  'обороты': { key: 'rotation_speed', name: 'Частота вращения вала', sectionCode: 'mechanics', fieldType: 'NUMBER', unit: 'об/мин' },

  // 6. Эксплуатационные требования и метрология
  'влияет на непрерывность процесса': { key: 'is_critical_path', name: 'Влияет на непрерывность процесса', sectionCode: 'operational', fieldType: 'BOOLEAN' },
  'непрерывность процесса': { key: 'is_critical_path', name: 'Влияет на непрерывность процесса', sectionCode: 'operational', fieldType: 'BOOLEAN' },
  'критический путь': { key: 'is_critical_path', name: 'Влияет на непрерывность процесса', sectionCode: 'operational', fieldType: 'BOOLEAN' },
  'периодичность поверки датчиков': { key: 'calibration_interval', name: 'Периодичность поверки датчиков', sectionCode: 'operational', fieldType: 'NUMBER', unit: 'мес.' },
  'поверка датчиков': { key: 'calibration_interval', name: 'Периодичность поверки датчиков', sectionCode: 'operational', fieldType: 'NUMBER', unit: 'мес.' },
  'интервал поверки': { key: 'calibration_interval', name: 'Периодичность поверки датчиков', sectionCode: 'operational', fieldType: 'NUMBER', unit: 'мес.' },
};

const RU_WORD_TRANSLATE: Record<string, string> = {
  код: 'code',
  номер: 'number',
  группа: 'group',
  тип: 'type',
  вид: 'kind',
  статус: 'status',
  состояние: 'condition',
  износ: 'wear',
  процент: 'percentage',
  критичность: 'criticality',
  чистота: 'cleanliness',
  помещение: 'room',
  класс: 'class',
  периодичность: 'periodicity',
  регламент: 'regulation',
  график: 'schedule',
  количество: 'count',
  ответственный: 'responsible',
  лицо: 'person',
  фио: 'name',
  должность: 'position',
  система: 'system',
  напряжение: 'voltage',
  мощность: 'power',
  ток: 'current',
  фаза: 'phase',
  фазы: 'phases',
  давление: 'pressure',
  скорость: 'speed',
  температура: 'temperature',
  габариты: 'dimensions',
  длина: 'length',
  ширина: 'width',
  высота: 'height',
  вес: 'weight',
  масса: 'weight',
  страна: 'country',
  город: 'city',
  год: 'year',
  дата: 'date',
  описание: 'description',
  примечание: 'notes',
  комментарий: 'comment',
  производитель: 'manufacturer',
  модель: 'model',
  серийный: 'serial',
  заводской: 'factory',
  инвентарный: 'inventory',
  локация: 'location',
  участок: 'site',
  цех: 'workshop',
  этаж: 'floor',
  корпус: 'building',
  поверка: 'calibration',
  интервал: 'interval',
  смазка: 'grease',
  хладагент: 'coolant',
  обороты: 'rpm',
  вращение: 'rotation',
  среда: 'medium',
  уникальный: 'unique',
  импортный: 'imported',
};

function makeEnglishSlug(str: string): string {
  const norm = normalizeHeader(str);

  // 1. Check exact or partial match in canonical dictionary
  if (CANONICAL_FIELD_DICTIONARY[norm]) {
    return CANONICAL_FIELD_DICTIONARY[norm].key;
  }

  for (const [phrase, def] of Object.entries(CANONICAL_FIELD_DICTIONARY)) {
    if (norm === phrase || norm.startsWith(phrase) || norm.includes(phrase)) {
      return def.key;
    }
  }

  // 2. Word-by-word intelligent dictionary translation
  const words = norm.split(/[\s_\-./\\]+/).filter(Boolean);
  const translatedWords = words.map((w) => {
    if (RU_WORD_TRANSLATE[w]) return RU_WORD_TRANSLATE[w];
    // fallback to Latin transliteration for unknown proper nouns
    const ruToEn: Record<string, string> = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i',
      й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
      у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
      э: 'e', ю: 'yu', я: 'ya',
    };
    return w
      .split('')
      .map((c) => ruToEn[c] || c)
      .join('');
  });

  const slug = translatedWords
    .join('_')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || 'custom_field_' + Math.floor(Math.random() * 1000);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW) && !hasPermission(user, PERMISSIONS.EPS_IMPORT_EXECUTE)) {
      return forbiddenResponse();
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Файл не загружен' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json({ success: false, error: 'В файле нет листов с данными' }, { status: 400 });
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawJsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (rawJsonRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Файл пуст или не содержит строк' }, { status: 400 });
    }

    // Extract headers
    const fileHeaders = Object.keys(rawJsonRows[0]);

    // Fetch existing dictionary metadata
    const [existingCustomFields, sections] = await Promise.all([
      prisma.customFieldDefinition.findMany(),
      prisma.customSection.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);

    const mappedColumns: Record<string, string> = {};
    const missingFields: any[] = [];

    fileHeaders.forEach((header) => {
      const norm = normalizeHeader(header);

      // 1. Exact match against known base fields
      const matchedBaseExact = KNOWN_BASE_FIELDS.find((rule) =>
        rule.aliases.some((alias) => norm === alias)
      );

      if (matchedBaseExact) {
        mappedColumns[header] = matchedBaseExact.targetKey;
        return;
      }

      // 2. Check existing custom fields in DB (by name, key, or name+unit)
      const matchedCustom = existingCustomFields.find(
        (cf) =>
          normalizeHeader(cf.name) === norm ||
          cf.key === norm ||
          (cf.unit && normalizeHeader(`${cf.name} ${cf.unit}`) === norm)
      );

      if (matchedCustom) {
        mappedColumns[header] = `custom_${matchedCustom.key}`;
        return;
      }

      // 3. Check Canonical Field Dictionary (e.g. is_unique, is_imported, country_origin, etc.)
      const canonicalMatch = CANONICAL_FIELD_DICTIONARY[norm] || Object.values(CANONICAL_FIELD_DICTIONARY).find((c) => normalizeHeader(c.name) === norm);
      if (canonicalMatch) {
        // Check if this canonical field already exists in DB by key
        const existingDef = existingCustomFields.find((cf) => cf.key === canonicalMatch.key);
        if (existingDef) {
          mappedColumns[header] = `custom_${existingDef.key}`;
          return;
        }
      }

      // 4. Controlled prefix/fuzzy match for base fields (excluding 'name' to avoid false positives on 'оборудование')
      const matchedBaseFuzzy = KNOWN_BASE_FIELDS.find((rule) => {
        if (rule.targetKey === 'name') return false; // Name must only match exact aliases!
        return rule.aliases.some((alias) => norm.startsWith(alias) || alias.startsWith(norm));
      });

      if (matchedBaseFuzzy) {
        mappedColumns[header] = matchedBaseFuzzy.targetKey;
        return;
      }

      // 5. If not matched -> Missing field!
      const sampleVals = rawJsonRows.slice(0, 5).map((r) => r[header]);
      const suggestedKey = canonicalMatch?.key || makeEnglishSlug(header);
      const guessedType = canonicalMatch?.fieldType || guessFieldType(sampleVals);

      // Intelligent section inference
      let suggestedSectionName = 'Общероссийские и отраслевые классификаторы';
      let suggestedSectionCode = canonicalMatch?.sectionCode || 'classifiers';

      if (canonicalMatch?.sectionCode) {
        suggestedSectionCode = canonicalMatch.sectionCode;
        if (suggestedSectionCode === 'condition_wear') suggestedSectionName = 'Техническое состояние, износ и критичность';
        else if (suggestedSectionCode === 'maintenance_regulations') suggestedSectionName = 'Регламент ТОиР и график обслуживания';
        else if (suggestedSectionCode === 'electrical') suggestedSectionName = 'Электротехнические параметры';
        else if (suggestedSectionCode === 'mechanics') suggestedSectionName = 'Механика, гидравлика и среда';
        else if (suggestedSectionCode === 'operational') suggestedSectionName = 'Эксплуатационные требования и метрология';
      } else if (/износ|критичност|чистот|уникальн|импортн|стран|год|возраст/i.test(header)) {
        suggestedSectionName = 'Техническое состояние, износ и критичность';
        suggestedSectionCode = 'condition_wear';
      } else if (/то|регламент|график|обслуживан|ответствен/i.test(header)) {
        suggestedSectionName = 'Регламент ТОиР и график обслуживания';
        suggestedSectionCode = 'maintenance_regulations';
      } else if (/напряжен|мощност|ток|фаз|ибп|электр/i.test(header)) {
        suggestedSectionName = 'Электротехнические параметры';
        suggestedSectionCode = 'electrical';
      } else if (/давлен|хладагент|скорост|механ|гидравлик/i.test(header)) {
        suggestedSectionName = 'Механика, гидравлика и среда';
        suggestedSectionCode = 'mechanics';
      }

      const targetSection = sections.find(
        (s) => s.code === suggestedSectionCode || s.name.toLowerCase() === suggestedSectionName.toLowerCase()
      );

      missingFields.push({
        header,
        suggestedName: canonicalMatch?.name || header.replace(/[*[\]()]/g, '').trim(),
        suggestedKey,
        suggestedType: guessedType,
        suggestedUnit: canonicalMatch?.unit || header.match(/\[(.*?)\]/)?.[1] || null,
        suggestedSectionName,
        suggestedSectionCode,
        sectionId: targetSection ? targetSection.id : null,
        sampleValues: sampleVals.filter((v) => v !== null && v !== undefined),
      });
    });

    // Check collisions in database
    const inventoryNumbersInFile = rawJsonRows
      .map((r) => {
        const invHeader = Object.keys(mappedColumns).find((h) => mappedColumns[h] === 'inventoryNumber');
        return invHeader ? String(r[invHeader] || '').trim() : null;
      })
      .filter(Boolean) as string[];

    const serialNumbersInFile = rawJsonRows
      .map((r) => {
        const snHeader = Object.keys(mappedColumns).find((h) => mappedColumns[h] === 'serialNumber');
        return snHeader ? String(r[snHeader] || '').trim() : null;
      })
      .filter(Boolean) as string[];

    const [existingByInv, existingBySn] = await Promise.all([
      prisma.equipment.findMany({
        where: { inventoryNumber: { in: inventoryNumbersInFile } },
        select: { id: true, name: true, inventoryNumber: true, status: true },
      }),
      prisma.equipment.findMany({
        where: { serialNumber: { in: serialNumbersInFile } },
        select: { id: true, name: true, serialNumber: true, status: true },
      }),
    ]);

    const existingInvMap = new Map<string, any>();
    existingByInv.forEach((eq) => {
      if (eq.inventoryNumber) existingInvMap.set(eq.inventoryNumber, eq);
    });

    const existingSnMap = new Map<string, any>();
    existingBySn.forEach((eq) => {
      if (eq.serialNumber) existingSnMap.set(eq.serialNumber, eq);
    });

    // Validate rows and flag collision statuses
    let newCount = 0;
    let collisionCount = 0;
    let errorCount = 0;

    const validatedRows = rawJsonRows.map((row, idx) => {
      const nameHeader = Object.keys(mappedColumns).find((h) => mappedColumns[h] === 'name');
      const invHeader = Object.keys(mappedColumns).find((h) => mappedColumns[h] === 'inventoryNumber');
      const snHeader = Object.keys(mappedColumns).find((h) => mappedColumns[h] === 'serialNumber');

      const nameVal = nameHeader ? String(row[nameHeader] || '').trim() : '';
      const invVal = invHeader ? String(row[invHeader] || '').trim() : '';
      const snVal = snHeader ? String(row[snHeader] || '').trim() : '';

      let rowStatus: 'NEW' | 'COLLISION' | 'ERROR' = 'NEW';
      let statusMessage = 'Готово к созданию';
      let existingMatch: any = null;

      if (!nameVal) {
        rowStatus = 'ERROR';
        statusMessage = 'Отсутствует обязательное наименование оборудования';
        errorCount++;
      } else if (invVal && existingInvMap.has(invVal)) {
        rowStatus = 'COLLISION';
        existingMatch = existingInvMap.get(invVal);
        statusMessage = `Совпадение по инв. № ${invVal} (${existingMatch.name})`;
        collisionCount++;
      } else if (snVal && existingSnMap.has(snVal)) {
        rowStatus = 'COLLISION';
        existingMatch = existingSnMap.get(snVal);
        statusMessage = `Совпадение по серийному № ${snVal} (${existingMatch.name})`;
        collisionCount++;
      } else {
        newCount++;
      }

      return {
        rowIndex: idx + 1,
        status: rowStatus,
        statusMessage,
        existingMatch,
        data: row,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        totalRows: rawJsonRows.length,
        newCount,
        collisionCount,
        errorCount,
        fileHeaders,
        mappedColumns,
        missingFields,
        availableSections: sections,
        previewRows: validatedRows.slice(0, 50),
        allRows: validatedRows,
      },
    });
  } catch (error: any) {
    console.error('Ошибка анализа файла импорта:', error);
    return NextResponse.json({ success: false, error: 'Ошибка анализа файла импорта' }, { status: 500 });
  }
}
