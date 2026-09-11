#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const XLSX = require('../apps/web/node_modules/xlsx');
const { PrismaClient } = require('../packages/database/node_modules/@prisma/client');

const prisma = new PrismaClient();
const registryPath = path.resolve(process.cwd(), 'Temp/Реестр оборудования ОГМ (7).xlsx');
const applyChanges = process.argv.includes('--apply');

const clean = (value) => value === null || value === undefined ? '' : String(value).trim();

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : null;
}

function parseBoolean(value) {
  const normalized = clean(value).toLowerCase();
  if (value === true || value === 1 || ['true', 'да', 'yes', '1'].includes(normalized)) return true;
  if (value === false || value === 0 || ['false', 'нет', 'no', '0'].includes(normalized)) return false;
  return null;
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const text = clean(value);
  if (!text) return null;
  const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const date = match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapStatus(value) {
  const status = clean(value).toLowerCase();
  if (status.includes('ремонт')) return 'UNDER_REPAIR';
  if (status.includes('хран')) return 'IN_STORAGE';
  if (status.includes('спис') || status.includes('вывед')) return 'DECOMMISSIONED';
  if (status.includes('неактив')) return 'INACTIVE';
  return 'ACTIVE';
}

function mergeRows(rows) {
  const grouped = new Map();
  let duplicateRows = 0;
  for (const row of rows) {
    const id = clean(row['ID оборудования']);
    if (!id || !clean(row['Наименование оборудования'])) continue;
    const previous = grouped.get(id);
    if (!previous) {
      grouped.set(id, { ...row });
      continue;
    }
    duplicateRows++;
    for (const [key, value] of Object.entries(row)) {
      if ((previous[key] === null || previous[key] === undefined || clean(previous[key]) === '') && clean(value)) {
        previous[key] = value;
      }
    }
  }
  return { rows: [...grouped.values()], duplicateRows };
}

function expandRegistryRows(rows) {
  let currentId = '';
  return rows.map((row) => {
    const id = clean(row['ID оборудования']);
    if (id) currentId = id;
    return currentId ? { ...row, 'ID оборудования': currentId } : row;
  });
}

function toEquipment(row, createdById, inventoryNumbers) {
  const externalId = clean(row['ID оборудования']);
  const inventory = clean(row['Инв. №']) || null;
  const canUseInventory = inventory && inventory !== 'б/н' && !inventoryNumbers.has(inventory);
  if (canUseInventory) inventoryNumbers.add(inventory);
  const customFields = {
    external_system_id: externalId,
    registry_inventory_number: inventory,
    decimal_number: clean(row['Децимальный номер']) || null,
    department: clean(row['Комплекс / группа']) || null,
    equipment_type: clean(row['Группа оборудования']) || null,
    location_detail: clean(row['Расположение (улица, корпус, этаж, участок)']) || null,
    responsible_person_name: clean(row['Ответственный']) || null,
    country_origin: clean(row['Страна производитель']) || null,
    prod_year: parseNumber(row['Год выпуска']),
    comm_year: parseNumber(row['Год ввода']),
    equipment_age: parseNumber(row['Возраст оборудования']),
    criticality: clean(row['Критичность']) || null,
    maintenance_periodicity: clean(row['Периодичность технического обслуживания']) || null,
    maintenance_schedule_year: clean(row['Техническое обслуживание 2026']) || null,
    to_count_scheduled: parseNumber(row['Кол-во ТО по графику']),
    okof_code: clean(row['Код ОКОФ 2']) || null,
    process_classifier_code: clean(row['Классификатор техпроцесса, код']) || null,
    is_unique: parseBoolean(row['Уникальное оборудование']),
    is_imported: parseBoolean(row['Импортное оборудование']),
    actual_wear_percentage: parseNumber(row['Фактический износ, %']),
    okpd2_code: clean(row['Код ОКПД 2']) || null,
    linkage_key: clean(row['Ключ связи']) || null,
    note: clean(row['Примечание']) || null,
  };
  return {
    name: clean(row['Наименование оборудования']),
    inventoryNumber: canUseInventory ? inventory : null,
    serialNumber: clean(row['Заводской №']) || null,
    manufacturer: clean(row['Наименование производителя']) || null,
    location: clean(row['Расположение (улица, корпус, этаж, участок)']) || null,
    status: mapStatus(row['Статус']),
    commissionDate: parseDate(row['Год ввода']),
    customFields,
    createdById,
  };
}

async function resetEquipmentData(tx) {
  await tx.equipment.deleteMany();
}

async function main() {
  if (!fs.existsSync(registryPath)) throw new Error(`Не найден реестр: ${registryPath}`);
  const workbook = XLSX.readFile(registryPath, { cellDates: true });
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets['Реестр оборудования'], { defval: null, range: 3 });
  const sourceRows = expandRegistryRows(rawRows);
  const { rows, duplicateRows } = mergeRows(sourceRows);
  const admin = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: 'admin' } } } },
    select: { id: true },
  }) || await prisma.user.findFirst({ select: { id: true } });
  if (!admin) throw new Error('В базе нет пользователя для createdById');

  const existingCount = await prisma.equipment.count();
  const inventoryNumbers = new Set();
  const operations = rows.map((row) => toEquipment(row, admin.id, inventoryNumbers));
  console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'dry-run', sourceRows: rawRows.length, rowsWithNameAndId: rows.length, duplicateRows, existingEquipment: existingCount, recordsAfterReset: operations.length, skippedWithoutId: rawRows.filter((row) => !clean(row['ID оборудования'])).length }, null, 2));
  if (!applyChanges) return;

  let created = 0;
  await prisma.$transaction(async (tx) => {
    await resetEquipmentData(tx);
    for (const data of operations) {
      await tx.equipment.create({ data });
      created++;
    }
  });
  console.log(JSON.stringify({ deleted: existingCount, created }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
