// ==============================================================================
// EMS Platform — Полный импорт 187 единиц оборудования и 81 документа
// Запуск на сервере: node scripts/import-full-equipment-and-docs.js
// ==============================================================================

const fs = require('fs');
const path = require('path');
const XLSX = require('./apps/web/node_modules/xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const UPLOAD_DEST_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

const SECTIONS = [
  { code: 'classifiers', name: 'Общероссийские и отраслевые классификаторы', sortOrder: 1, icon: 'Category' },
  { code: 'condition_wear', name: 'Техническое состояние, износ и критичность', sortOrder: 2, icon: 'Speed' },
  { code: 'maintenance_regulations', name: 'Регламент ТОиР и график обслуживания', sortOrder: 3, icon: 'Shield' },
  { code: 'electrical', name: 'Электротехнические параметры', sortOrder: 4, icon: 'Bolt' },
  { code: 'mechanics', name: 'Механика, гидравлика и среда', sortOrder: 5, icon: 'WaterDrop' },
  { code: 'operational', name: 'Эксплуатационные требования и метрология', sortOrder: 6, icon: 'Straighten' },
];

const CANONICAL_FIELDS = [
  // 1. Классификаторы
  { key: 'decimal_number', name: 'Децимальный номер', fieldType: 'TEXT', sectionCode: 'classifiers', sortOrder: 1 },
  { key: 'okof_code', name: 'Код по ОКОФ (ОК 013-2014)', fieldType: 'TEXT', sectionCode: 'classifiers', sortOrder: 2 },
  { key: 'okpd2_code', name: 'Код по ОКПД2 (ОК 034-2014)', fieldType: 'TEXT', sectionCode: 'classifiers', sortOrder: 3 },
  { key: 'process_classifier_code', name: 'Код технологического классификатора', fieldType: 'TEXT', sectionCode: 'classifiers', sortOrder: 4 },
  { key: 'equipment_group', name: 'Группа оборудования', fieldType: 'TEXT', sectionCode: 'classifiers', sortOrder: 5 },
  { key: 'equipment_type', name: 'Тип оборудования (Установка)', fieldType: 'TEXT', sectionCode: 'classifiers', sortOrder: 6 },

  // 2. Состояние, износ и критичность
  { key: 'country_origin', name: 'Страна производитель', fieldType: 'TEXT', sectionCode: 'condition_wear', sortOrder: 1 },
  { key: 'prod_year', name: 'Год выпуска', fieldType: 'NUMBER', sectionCode: 'condition_wear', sortOrder: 2 },
  { key: 'comm_year', name: 'Год ввода', fieldType: 'NUMBER', sectionCode: 'condition_wear', sortOrder: 3 },
  { key: 'equipment_age', name: 'Возраст оборудования', fieldType: 'NUMBER', unit: 'лет', sectionCode: 'condition_wear', sortOrder: 4 },
  { key: 'actual_wear_percentage', name: 'Фактический процент износа', fieldType: 'NUMBER', unit: '%', sectionCode: 'condition_wear', sortOrder: 5 },
  { key: 'criticality', name: 'Категория критичности', fieldType: 'TEXT', sectionCode: 'condition_wear', sortOrder: 6 },
  { key: 'clean_room_class', name: 'Класс чистоты помещения (ISO)', fieldType: 'TEXT', sectionCode: 'condition_wear', sortOrder: 7 },
  { key: 'is_unique', name: 'Уникальное / единичное оборудование', fieldType: 'BOOLEAN', sectionCode: 'condition_wear', sortOrder: 8 },
  { key: 'is_imported', name: 'Импортное оборудование', fieldType: 'BOOLEAN', sectionCode: 'condition_wear', sortOrder: 9 },

  // 3. Регламент ТОиР
  { key: 'maintenance_periodicity', name: 'Периодичность регламентного ТО', fieldType: 'TEXT', sectionCode: 'maintenance_regulations', sortOrder: 1 },
  { key: 'maintenance_schedule_year', name: 'Утвержденный график ТО на 2026 год', fieldType: 'TEXT', sectionCode: 'maintenance_regulations', sortOrder: 2 },
  { key: 'to_count_scheduled', name: 'Количество ТО по графику', fieldType: 'NUMBER', sectionCode: 'maintenance_regulations', sortOrder: 3 },
  { key: 'responsible_person_name', name: 'Ответственное лицо (ФИО / Должность)', fieldType: 'TEXT', sectionCode: 'maintenance_regulations', sortOrder: 4 },
  { key: 'external_system_id', name: 'Идентификатор во внешней системе (1С / ERP)', fieldType: 'TEXT', sectionCode: 'maintenance_regulations', sortOrder: 5 },

  // 4. Электрика
  { key: 'operating_voltage', name: 'Рабочее напряжение', fieldType: 'TEXT', sectionCode: 'electrical', sortOrder: 1 },
  { key: 'power_kw', name: 'Номинальная мощность', fieldType: 'NUMBER', unit: 'кВт', sectionCode: 'electrical', sortOrder: 2 },
  { key: 'nominal_current', name: 'Номинальный ток', fieldType: 'NUMBER', unit: 'А', sectionCode: 'electrical', sortOrder: 3 },
  { key: 'phase_count', name: 'Количество фаз', fieldType: 'NUMBER', sectionCode: 'electrical', sortOrder: 4 },
  { key: 'ups_required', name: 'Требование к наличию ИБП', fieldType: 'TEXT', sectionCode: 'electrical', sortOrder: 5 },

  // 5. Механика
  { key: 'operating_pressure', name: 'Рабочее давление', fieldType: 'NUMBER', unit: 'МПа', sectionCode: 'mechanics', sortOrder: 1 },
  { key: 'coolant_type', name: 'Тип смазки / хладагента', fieldType: 'TEXT', sectionCode: 'mechanics', sortOrder: 2 },
  { key: 'rotation_speed', name: 'Частота вращения вала', fieldType: 'NUMBER', unit: 'об/мин', sectionCode: 'mechanics', sortOrder: 3 },

  // 6. Эксплуатация
  { key: 'is_critical_path', name: 'Влияет на непрерывность процесса', fieldType: 'BOOLEAN', sectionCode: 'operational', sortOrder: 1 },
  { key: 'calibration_interval', name: 'Периодичность поверки датчиков', fieldType: 'NUMBER', unit: 'мес.', sectionCode: 'operational', sortOrder: 2 },
];

function getMimeType(ext) {
  const map = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.txt': 'text/plain',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

function parseBool(val) {
  if (val === true || val === 1 || String(val).toLowerCase() === 'true' || String(val).toLowerCase() === 'да') return true;
  if (val === false || val === 0 || String(val).toLowerCase() === 'false' || String(val).toLowerCase() === 'нет') return false;
  return null;
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(String(val).replace(',', '.').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? null : n;
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeDocType(typeStr) {
  const t = (typeStr || '').toUpperCase().trim();
  if (t === 'PASSPORT') return 'PASSPORT';
  if (t === 'OPERATION_MANUAL' || t === 'MANUAL') return 'MANUAL';
  if (t === 'DRAWING' || t === 'SCHEMA') return 'SCHEMA';
  if (t === 'CERTIFICATE') return 'CERTIFICATE';
  if (t === 'ACT') return 'ACT';
  return 'OTHER';
}

async function main() {
  console.log('===============================================================');
  console.log('🚀 EMS Platform: Полный импорт оборудования и привязка документов');
  console.log('===============================================================');

  // 1. Получаем администратора для аудита
  let adminUser = await prisma.user.findFirst({
    where: { roles: { some: { role: { code: 'admin' } } } },
    select: { id: true },
  });
  if (!adminUser) {
    adminUser = await prisma.user.findFirst({ select: { id: true } });
  }
  if (!adminUser) {
    console.error('❌ Не найден пользователь в базе данных.');
    process.exit(1);
  }

  // 2. Инициализируем и проверяем 6 групп (CustomSection)
  console.log('\n📁 1. Инициализация 6 технических разделов и 26 канонических полей...');
  const sectionIdMap = new Map();
  for (const s of SECTIONS) {
    const sec = await prisma.customSection.upsert({
      where: { code: s.code },
      update: { name: s.name, sortOrder: s.sortOrder, icon: s.icon },
      create: { code: s.code, name: s.name, sortOrder: s.sortOrder, icon: s.icon },
    });
    sectionIdMap.set(s.code, sec.id);
  }

  for (const f of CANONICAL_FIELDS) {
    await prisma.customFieldDefinition.upsert({
      where: { key: f.key },
      update: {
        name: f.name,
        fieldType: f.fieldType,
        unit: f.unit || null,
        sectionId: sectionIdMap.get(f.sectionCode),
        sortOrder: f.sortOrder,
      },
      create: {
        key: f.key,
        name: f.name,
        fieldType: f.fieldType,
        unit: f.unit || null,
        sectionId: sectionIdMap.get(f.sectionCode),
        sortOrder: f.sortOrder,
      },
    });
  }

  // Очищаем старые дублирующиеся поля
  await prisma.customFieldDefinition.deleteMany({
    where: {
      key: {
        in: [
          'unikal_noe_oborudovanie',
          'unikalnoe_oborudovanie',
          'import_noe_oborudovanie',
          'importnoe_oborudovanie',
          'otvetstvennoe_litso_fio_dolzhnost',
          'otvetstvennyy',
          'kod_okof_2',
          'kod_okpd_2',
          'fakticheskiy_iznos',
          'tehnicheskoe_obsluzhivanie_2026',
          'kol_vo_to_po_grafiku',
          'klassifikator_tehprotsessa_kod',
          'kompleks_gruppa',
          'zavodskoy_nomer',
          'raspolozhenie_ulitsa_korpus_etazh_uchastok',
        ],
      },
    },
  });

  // 3. Импорт 187 единиц оборудования из import_equipment_all.xlsx
  console.log('\n📦 2. Импорт оборудования из temp/import_equipment_all.xlsx...');
  const excelPath = path.resolve(process.cwd(), 'temp/import_equipment_all.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Файл ${excelPath} не найден.`);
    process.exit(1);
  }

  const wb = XLSX.readFile(excelPath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`Найдено строк в файле: ${rows.length}`);

  let createdEq = 0;
  let updatedEq = 0;

  for (const r of rows) {
    const name = String(r['Наименование оборудования'] || '').trim();
    if (!name) continue;

    const inv = r['Инвентарный номер'] ? String(r['Инвентарный номер']).trim() : null;
    const sn = r['Заводской / Серийный номер'] ? String(r['Заводской / Серийный номер']).trim() : null;
    const mfg = r['Производитель'] ? String(r['Производитель']).trim() : null;
    const model = r['Модель / Модификация'] ? String(r['Модель / Модификация']).trim() : null;
    const loc = r['Место установки (Локация)'] ? String(r['Место установки (Локация)']).trim() : null;
    const commDate = parseDate(r['Дата ввода в эксплуатацию']);

    // Формируем кастомные характеристики (чистые 26 полей без МОЛ)
    const customFields = {};
    if (r['Децимальный номер']) customFields.decimal_number = String(r['Децимальный номер']).trim();
    if (r['Код по ОКОФ (ОК 013-2014)']) customFields.okof_code = String(r['Код по ОКОФ (ОК 013-2014)']).trim();
    if (r['Код по ОКПД2 (ОК 034-2014)']) customFields.okpd2_code = String(r['Код по ОКПД2 (ОК 034-2014)']).trim();
    if (r['Код технологического классификатора']) customFields.process_classifier_code = String(r['Код технологического классификатора']).trim();
    if (r['Группа оборудования']) customFields.equipment_group = String(r['Группа оборудования']).trim();
    if (r['Тип оборудования (Установка)']) customFields.equipment_type = String(r['Тип оборудования (Установка)']).trim();
    if (r['Страна производитель']) customFields.country_origin = String(r['Страна производитель']).trim();
    if (r['Год выпуска'] !== undefined) customFields.prod_year = parseNum(r['Год выпуска']);
    if (r['Год ввода'] !== undefined) customFields.comm_year = parseNum(r['Год ввода']);
    if (r['Возраст оборудования'] !== undefined) customFields.equipment_age = parseNum(r['Возраст оборудования']);
    if (r['Категория критичности']) customFields.criticality = String(r['Категория критичности']).trim();
    if (r['Фактический процент износа'] !== undefined) customFields.actual_wear_percentage = parseNum(r['Фактический процент износа']);
    if (r['Класс чистоты помещения (ISO)']) customFields.clean_room_class = String(r['Класс чистоты помещения (ISO)']).trim();
    if (r['Уникальное / единичное оборудование'] !== undefined) customFields.is_unique = parseBool(r['Уникальное / единичное оборудование']);
    if (r['Импортное оборудование'] !== undefined) customFields.is_imported = parseBool(r['Импортное оборудование']);
    if (r['Периодичность регламентного ТО']) customFields.maintenance_periodicity = String(r['Периодичность регламентного ТО']).trim();
    if (r['Утвержденный график ТО на 2026 год']) customFields.maintenance_schedule_year = String(r['Утвержденный график ТО на 2026 год']).trim();
    if (r['Количество ТО по графику'] !== undefined) customFields.to_count_scheduled = parseNum(r['Количество ТО по графику']);

    // Ищем существующее оборудование
    let existing = null;
    if (inv) {
      existing = await prisma.equipment.findUnique({ where: { inventoryNumber: inv } });
    }
    if (!existing && sn) {
      existing = await prisma.equipment.findFirst({ where: { serialNumber: sn } });
    }
    if (!existing && model) {
      existing = await prisma.equipment.findFirst({ where: { name, model } });
    }

    if (existing) {
      await prisma.equipment.update({
        where: { id: existing.id },
        data: {
          name,
          inventoryNumber: inv || existing.inventoryNumber,
          serialNumber: sn || existing.serialNumber,
          manufacturer: mfg || existing.manufacturer,
          model: model || existing.model,
          location: loc || existing.location,
          commissionDate: commDate || existing.commissionDate,
          customFields,
        },
      });
      updatedEq++;
    } else {
      await prisma.equipment.create({
        data: {
          name,
          inventoryNumber: inv,
          serialNumber: sn,
          manufacturer: mfg,
          model,
          location: loc,
          commissionDate: commDate,
          status: 'ACTIVE',
          customFields,
          createdById: adminUser.id,
        },
      });
      createdEq++;
    }
  }

  const totalInDb = await prisma.equipment.count({ where: { deletedAt: null } });
  console.log(`✅ Оборудование импортировано: создано ${createdEq}, обновлено ${updatedEq}. Всего в базе: ${totalInDb}`);

  // 4. Привязка документов
  console.log('\n📄 3. Привязка документов из temp/documents_equipment_registry.csv и temp/uploads...');
  const csvPath = path.resolve(process.cwd(), 'temp/documents_equipment_registry.csv');
  const allEquipments = await prisma.equipment.findMany({
    select: { id: true, name: true, inventoryNumber: true, model: true, serialNumber: true, customFields: true },
  });

  let linkedDocs = 0;

  if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n').slice(1);

    for (const line of lines) {
      const cols = line.split(';');
      if (cols.length < 8) continue;

      const inv = cols[2]?.trim();
      const name = cols[3]?.trim();
      const model = cols[4]?.trim();
      const docTypeRaw = cols[5]?.trim();
      const docTitle = cols[6]?.trim();
      const fileName = cols[7]?.trim();
      const storagePath = cols[8]?.trim(); // local://2026/07/...
      const origFileName = cols[10]?.trim() || fileName;

      // Ищем оборудование
      const eq = allEquipments.find((e) => {
        if (inv && inv !== '--' && inv !== '-' && e.inventoryNumber === inv) return true;
        if (model && e.model === model) return true;
        if (name && e.name.toLowerCase() === name.toLowerCase()) return true;
        return false;
      });

      if (!eq) continue;

      // Физический путь к файлу в temp/uploads
      const relPath = storagePath.replace('local://', '');
      const srcFile = path.resolve(process.cwd(), 'temp/uploads', relPath);

      if (!fs.existsSync(srcFile)) {
        continue;
      }

      // Копируем файл в целевую директорию uploads/documents
      const destFolder = path.join(UPLOAD_DEST_DIR, 'documents');
      if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });

      const destFile = path.join(destFolder, path.basename(srcFile));
      fs.copyFileSync(srcFile, destFile);

      const stat = fs.statSync(destFile);
      const ext = path.extname(destFile).toLowerCase();

      // Проверяем, существует ли уже документ в БД
      const existingDoc = await prisma.document.findFirst({
        where: { equipmentId: eq.id, fileName: path.basename(destFile) },
      });

      if (!existingDoc) {
        await prisma.document.create({
          data: {
            equipmentId: eq.id,
            fileName: path.basename(destFile),
            originalName: origFileName || fileName,
            filePath: `documents/${path.basename(destFile)}`,
            fileType: getMimeType(ext),
            fileSize: stat.size,
            docType: normalizeDocType(docTypeRaw),
            description: docTitle || `Документ к оборудованию ${eq.inventoryNumber || eq.name}`,
            uploadedById: adminUser.id,
          },
        });
        linkedDocs++;
      }
    }
  }

  const totalDocsInDb = await prisma.document.count({ where: { deletedAt: null } });
  console.log(`✅ Документы обработаны: привязано новых ${linkedDocs}. Всего документов в базе: ${totalDocsInDb}`);

  console.log('\n===============================================================');
  console.log('🎉 Импорт успешно завершен в полном объеме!');
  console.log(`📊 Оборудование в базе: ${totalInDb} ед.`);
  console.log(`📄 Документов в базе: ${totalDocsInDb} шт.`);
  console.log('===============================================================');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при выполнении импорта:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
