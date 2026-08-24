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
    aliases: ['наименование оборудования', 'название оборудования', 'оборудование', 'наименование', 'название', 'name', 'title', 'equipment name', 'equipment_name'],
  },
  {
    targetKey: 'inventoryNumber',
    targetName: 'Инвентарный номер',
    aliases: ['инвентарный номер', 'инвентарный', 'инв. номер', 'инв номер', 'инв. №', 'инв №', 'инв.', 'инв', 'inventorynumber', 'inventory number', 'inv number', 'inv no'],
  },
  {
    targetKey: 'serialNumber',
    targetName: 'Заводской / Серийный номер',
    aliases: ['заводской / серийный номер', 'заводской номер', 'серийный номер', 'заводской №', 'заводской', 'зав. номер', 'зав. №', 'зав №', 'зав.', 'серийный', 'serialnumber', 'serial number', 'serial', 'sn'],
  },
  {
    targetKey: 'manufacturer',
    targetName: 'Производитель',
    aliases: ['наименование производителя', 'производитель', 'изготовитель', 'бренд', 'завод-изготовитель', 'завод изготовитель', 'вендор', 'производитель / бренд', 'страна / производитель', 'manufacturer', 'vendor', 'brand', 'make'],
  },
  {
    targetKey: 'model',
    targetName: 'Модель / Модификация',
    aliases: ['модель / модификация', 'модель', 'модификация', 'марка', 'model', 'type'],
  },
  {
    targetKey: 'location',
    targetName: 'Место установки (Локация)',
    aliases: ['расположение (улица, корпус, этаж, участок)', 'место установки (локация)', 'расположение', 'место установки', 'локация', 'цех', 'участок', 'местоположение', 'помещение', 'location', 'site', 'placement'],
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
    .replace(/[*[\]()]/g, '')
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

function makeSlug(str: string): string {
  const ruToEn: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
    э: 'e', ю: 'yu', я: 'ya',
  };

  let slug = str
    .toLowerCase()
    .split('')
    .map((char) => ruToEn[char] || char)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
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

      // 1. Exact match against base field aliases
      let matchedBase = KNOWN_BASE_FIELDS.find((rule) =>
        rule.aliases.some((alias) => norm === alias)
      );

      // 2. If no exact match, find best match prioritized by alias length (longest alias first)
      if (!matchedBase) {
        let bestTargetKey: string | null = null;
        let longestMatch = 0;

        for (const rule of KNOWN_BASE_FIELDS) {
          for (const alias of rule.aliases) {
            if (norm.includes(alias) || alias.includes(norm)) {
              if (alias.length > longestMatch && alias.length >= 4) {
                longestMatch = alias.length;
                bestTargetKey = rule.targetKey;
              }
            }
          }
        }

        if (bestTargetKey) {
          matchedBase = KNOWN_BASE_FIELDS.find((r) => r.targetKey === bestTargetKey);
        }
      }

      if (matchedBase) {
        mappedColumns[header] = matchedBase.targetKey;
        return;
      }

      // Check existing custom fields
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

      // If not matched -> Missing field!
      const sampleVals = rawJsonRows.slice(0, 5).map((r) => r[header]);
      const guessedType = guessFieldType(sampleVals);
      const suggestedKey = makeSlug(header);

      // Intelligent section inference
      let suggestedSectionName = 'Общероссийские и отраслевые классификаторы';
      let suggestedSectionCode = 'classifiers';

      if (/износ|критичност|чистот|уникальн|импортн|стран|год|возраст/i.test(header)) {
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
        suggestedName: header.replace(/[*[\]()]/g, '').trim(),
        suggestedKey,
        suggestedType: guessedType,
        suggestedUnit: header.match(/\[(.*?)\]/)?.[1] || null,
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
