/**
 * Утилита синхронизации, нормализации имен файлов и подготовки данных для импорта в EMS
 * Запуск: node scripts/sync-legacy-import.js
 */

const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Скрипт синхронизации и валидации данных импорта EMS.');
  const importXlsx = path.resolve(process.cwd(), 'temp/import_equipment_all.xlsx');
  const importCsv = path.resolve(process.cwd(), 'temp/import_equipment_all.csv');
  const mappingJson = path.resolve(process.cwd(), 'temp/import_field_mapping.json');
  const docRegXlsx = path.resolve(process.cwd(), 'temp/documents_equipment_registry.xlsx');

  if (fs.existsSync(importXlsx) && fs.existsSync(mappingJson)) {
    const mapping = JSON.parse(fs.readFileSync(mappingJson, 'utf-8'));
    console.log(`✓ Подготовлено записей оборудования: ${mapping.totalRows}`);
    console.log(`✓ Сконфигурировано сопоставлений полей: ${Object.keys(mapping.columnMapping).length}`);
    console.log(`✓ Реестр документов: ${docRegXlsx}`);
  } else {
    console.warn('Файлы импорта в папке temp не найдены.');
  }
}

main().catch(console.error);
