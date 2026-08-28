import * as XLSX from 'xlsx';
import { prisma } from '@ems/database';
import {
  MAX_FILE_SIZE_BYTES,
  MAX_ROWS,
  MAX_COLS,
  KNOWN_BASE_FIELDS,
  CANONICAL_FIELD_DICTIONARY,
  normalizeHeader,
  guessFieldType,
  makeEnglishSlug,
  inferSection,
} from './eps-import-helpers';

export interface ParseWorkbookResult {
  error?: string;
  fileHeaders?: string[];
  rawJsonRows?: Record<string, unknown>[];
}

export async function parseImportWorkbook(file: File): Promise<ParseWorkbookResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxMb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    return { error: `Размер файла превышает допустимый лимит (${maxMb} МБ)` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, sheetRows: MAX_ROWS + 1 });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { error: 'В файле нет листов с данными' };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawJsonRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (rawJsonRows.length === 0) {
    return { error: 'Файл пуст или не содержит строк' };
  }

  if (rawJsonRows.length > MAX_ROWS) {
    return { error: `Файл содержит слишком много строк (максимум ${MAX_ROWS})` };
  }

  const fileHeaders = Object.keys(rawJsonRows[0]);
  if (fileHeaders.length > MAX_COLS) {
    return { error: `Файл содержит слишком много колонок (максимум ${MAX_COLS})` };
  }

  return { fileHeaders, rawJsonRows };
}

export interface MissingFieldInfo {
  header: string;
  suggestedName: string;
  suggestedKey: string;
  suggestedType: 'NUMBER' | 'DATE' | 'BOOLEAN' | 'TEXT';
  suggestedUnit: string | null;
  suggestedSectionName: string;
  suggestedSectionCode: string;
  sectionId: string | null;
  sampleValues: unknown[];
}

export interface HeaderMappingResult {
  mappedColumns: Record<string, string>;
  missingFields: MissingFieldInfo[];
}

export function mapFileHeaders(
  fileHeaders: string[],
  rawJsonRows: Record<string, unknown>[],
  existingCustomFields: Array<{ id: string; key: string; name: string; unit: string | null }>,
  sections: Array<{ id: string; code: string; name: string }>
): HeaderMappingResult {
  const mappedColumns: Record<string, string> = {};
  const missingFields: MissingFieldInfo[] = [];

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
        Boolean(cf.unit && normalizeHeader(`${cf.name} ${cf.unit}`) === norm)
    );

    if (matchedCustom) {
      mappedColumns[header] = `custom_${matchedCustom.key}`;
      return;
    }

    // 3. Check Canonical Field Dictionary
    const canonicalMatch =
      CANONICAL_FIELD_DICTIONARY[norm] ||
      Object.values(CANONICAL_FIELD_DICTIONARY).find((c) => normalizeHeader(c.name) === norm);

    if (canonicalMatch) {
      const existingDef = existingCustomFields.find((cf) => cf.key === canonicalMatch.key);
      if (existingDef) {
        mappedColumns[header] = `custom_${existingDef.key}`;
        return;
      }
    }

    // 4. Controlled prefix/fuzzy match for base fields (excluding 'name')
    const matchedBaseFuzzy = KNOWN_BASE_FIELDS.find((rule) => {
      if (rule.targetKey === 'name') return false;
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

    const { code: suggestedSectionCode, name: suggestedSectionName } = inferSection(header, canonicalMatch);

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

  return { mappedColumns, missingFields };
}

export interface ValidatedRow {
  rowIndex: number;
  status: 'NEW' | 'COLLISION' | 'ERROR';
  statusMessage: string;
  existingMatch: unknown;
  data: Record<string, unknown>;
}

export async function validateEquipmentCollisions(
  rawJsonRows: Record<string, unknown>[],
  mappedColumns: Record<string, string>
): Promise<{
  validatedRows: ValidatedRow[];
  newCount: number;
  collisionCount: number;
  errorCount: number;
}> {
  const invHeader = Object.keys(mappedColumns).find((h) => mappedColumns[h] === 'inventoryNumber');
  const snHeader = Object.keys(mappedColumns).find((h) => mappedColumns[h] === 'serialNumber');
  const nameHeader = Object.keys(mappedColumns).find((h) => mappedColumns[h] === 'name');

  const inventoryNumbersInFile = rawJsonRows
    .map((r) => (invHeader ? String(r[invHeader] || '').trim() : null))
    .filter(Boolean) as string[];

  const serialNumbersInFile = rawJsonRows
    .map((r) => (snHeader ? String(r[snHeader] || '').trim() : null))
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

  const existingInvMap = new Map<string, { id: string; name: string; inventoryNumber: string | null; status: string }>();
  existingByInv.forEach((eq) => {
    if (eq.inventoryNumber) existingInvMap.set(eq.inventoryNumber, eq);
  });

  const existingSnMap = new Map<string, { id: string; name: string; serialNumber: string | null; status: string }>();
  existingBySn.forEach((eq) => {
    if (eq.serialNumber) existingSnMap.set(eq.serialNumber, eq);
  });

  let newCount = 0;
  let collisionCount = 0;
  let errorCount = 0;

  const validatedRows: ValidatedRow[] = rawJsonRows.map((row, idx) => {
    const nameVal = nameHeader ? String(row[nameHeader] || '').trim() : '';
    const invVal = invHeader ? String(row[invHeader] || '').trim() : '';
    const snVal = snHeader ? String(row[snHeader] || '').trim() : '';

    let rowStatus: 'NEW' | 'COLLISION' | 'ERROR' = 'NEW';
    let statusMessage = 'Готово к созданию';
    let existingMatch: unknown = null;

    if (!nameVal) {
      rowStatus = 'ERROR';
      statusMessage = 'Отсутствует обязательное наименование оборудования';
      errorCount++;
    } else if (invVal && existingInvMap.has(invVal)) {
      rowStatus = 'COLLISION';
      existingMatch = existingInvMap.get(invVal);
      statusMessage = `Совпадение по инв. № ${invVal} (${(existingMatch as { name: string }).name})`;
      collisionCount++;
    } else if (snVal && existingSnMap.has(snVal)) {
      rowStatus = 'COLLISION';
      existingMatch = existingSnMap.get(snVal);
      statusMessage = `Совпадение по серийному № ${snVal} (${(existingMatch as { name: string }).name})`;
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

  return { validatedRows, newCount, collisionCount, errorCount };
}

export async function analyzeEquipmentImportFile(file: File) {
  const parseResult = await parseImportWorkbook(file);
  if (parseResult.error || !parseResult.fileHeaders || !parseResult.rawJsonRows) {
    return { error: parseResult.error || 'Ошибка чтения файла' };
  }

  const { fileHeaders, rawJsonRows } = parseResult;

  const [existingCustomFields, sections] = await Promise.all([
    prisma.customFieldDefinition.findMany({ select: { id: true, key: true, name: true, unit: true } }),
    prisma.customSection.findMany({ select: { id: true, code: true, name: true }, orderBy: { sortOrder: 'asc' } }),
  ]);

  const { mappedColumns, missingFields } = mapFileHeaders(
    fileHeaders,
    rawJsonRows,
    existingCustomFields,
    sections
  );

  const { validatedRows, newCount, collisionCount, errorCount } = await validateEquipmentCollisions(
    rawJsonRows,
    mappedColumns
  );

  return {
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
  };
}
