import { DOCUMENT_TYPE_MAP } from '@ems/shared';
import { getEquipmentDecimalNumber } from './eps-helpers';

export interface DocumentMatchTargetEquipment {
  id: string;
  name: string;
  inventoryNumber?: string | null;
  serialNumber?: string | null;
  model?: string | null;
  decimalNumber?: string | null;
}

export interface DocumentMatchResult {
  fileName: string;
  detectedDocType: string;
  detectedDocTypeLabel: string;
  docTypeConfidence: 'high' | 'medium' | 'low';
  matchedDecimalNumber: string | null;
  matchedModel: string | null;
  matchedEquipment: DocumentMatchTargetEquipment | null;
  suggestedBindingMode: 'DECIMAL' | 'MODEL' | 'EQUIPMENT' | null;
  matchingEquipmentCount: number;
  matchReason: string | null;
  confidence: 'high' | 'medium' | 'none';
}

export interface BindingTargetsCatalog {
  models: { model: string; count?: number; sampleEquipment?: string[] }[];
  decimalNumbers: { decimalNumber: string; count?: number; sampleEquipment?: string[] }[];
  equipmentList?: DocumentMatchTargetEquipment[];
}

function normalize(s?: string | null): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/gi, '');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Определение типа документа по имени файла на основе стандартов ЕСКД и ключевых слов.
 */
export function detectDocumentTypeFromFileName(fileName: string): {
  type: string;
  label: string;
  confidence: 'high' | 'medium' | 'low';
} {
  const nameWithoutExt = fileName.replace(/\.[a-z0-9]+$/i, '');
  const lower = nameWithoutExt.toLowerCase();

  // 1. Паспорта и формуляры (ПС, ФО)
  if (
    /паспорт|формуляр|passport|datasheet/i.test(lower) ||
    /(?:^|[\s_.])(?:пс|фо)(?:$|[\s_.])/i.test(lower) ||
    /\.\d{3}\s*пс/i.test(lower)
  ) {
    return { type: 'PASSPORT', label: DOCUMENT_TYPE_MAP.PASSPORT, confidence: 'high' };
  }

  // 2. Акты и протоколы (ввод, испытания, поверка, калибровка, приемка)
  if (
    /акт|испытани|поверк|калибровк|приемк|протокол|аттестат|protocol/i.test(lower) ||
    /(?:^|[\s_.])(?:act|test)(?:$|[\s_.])/i.test(lower) ||
    /(?:^|[\s_.])ввод(?:$|[\s_.])/i.test(lower)
  ) {
    return { type: 'ACT', label: DOCUMENT_TYPE_MAP.ACT, confidence: 'high' };
  }

  // 3. Сертификаты и декларации соответствия
  if (
    /сертификат|деклараци|соответств|соут|certificate|declaration|conformity/i.test(lower) ||
    /тр\s*тс/i.test(lower)
  ) {
    return { type: 'CERTIFICATE', label: DOCUMENT_TYPE_MAP.CERTIFICATE, confidence: 'high' };
  }

  // 4. Схемы и чертежи (Э1-Э7, СБ, ГЧ, МЧ, ВО, схемы, чертежи, dwg/dxf)
  if (
    /схем|чертеж|чертёж|габарит|schema|schematic|drawing|blueprint|wiring/i.test(lower) ||
    /(?:^|[\s_.])(?:сб|гч|мч|э[1-7])(?:$|[\s_.])/i.test(lower) ||
    /\.\d{3}\s*[эсгм][бч1-7]/i.test(lower) ||
    /\.(dwg|dxf|cdw)$/i.test(fileName)
  ) {
    return { type: 'SCHEMA', label: DOCUMENT_TYPE_MAP.SCHEMA, confidence: 'high' };
  }

  // 5. Руководства по эксплуатации и инструкции (РЭ, ИЭ, ТО, РО)
  if (
    /руководств|инструкц|manual|guide|эксплуатац|обслуживан|регламент/i.test(lower) ||
    /(?:^|[\s_.])(?:рэ|иэ|ро)(?:$|[\s_.])/i.test(lower) ||
    /(?:^|[\s_.])то[\s_](?:и|and)[\s_]тэ(?:$|[\s_.])/i.test(lower) ||
    /\.\d{3}\s*рэ/i.test(lower)
  ) {
    return { type: 'MANUAL', label: DOCUMENT_TYPE_MAP.MANUAL, confidence: 'high' };
  }

  return { type: 'OTHER', label: DOCUMENT_TYPE_MAP.OTHER, confidence: 'low' };
}

/**
 * Извлечение шаблона децимального номера ЕСКД из имени файла.
 * Формат: XXXX.123456.789 или XXXX.123456.789-01
 */
export function extractDecimalNumberFromFileName(fileName: string): string | null {
  const cleanName = fileName.replace(/\.[a-z0-9]+$/i, '');
  const match = cleanName.match(/(?:^|[^а-яa-z0-9])([а-яa-z]{4}\s*\.?\s*\d{6}\s*\.?\s*\d{3}(?:-\d{2,3})?)/i);
  if (!match || !match[1]) return null;

  // Приводим к каноническому виду XXXX.YYYYYY.ZZZ[-WW]
  const raw = match[1].replace(/\s+/g, '');
  const letters = raw.slice(0, 4).toUpperCase();
  const rest = raw.slice(4).replace(/^\./, '');
  const parts = rest.split('.');
  if (parts.length >= 2) {
    return `${letters}.${parts[0]}.${parts.slice(1).join('.')}`;
  }
  if (rest.length >= 9) {
    const code = rest.slice(0, 6);
    const sub = rest.slice(6);
    return `${letters}.${code}.${sub}`;
  }
  return raw.toUpperCase();
}

function findDecimalMatch(
  fileName: string,
  decimalList: { decimalNumber: string; count?: number }[]
): { decimal: string; count: number } | null {
  const normFile = normalize(fileName);
  const extracted = extractDecimalNumberFromFileName(fileName);

  for (const item of decimalList) {
    const dec = (item.decimalNumber || '').trim();
    if (!dec || dec.length < 4) continue;

    const normDec = normalize(dec);
    if (extracted && normalize(extracted) === normDec) {
      return { decimal: dec, count: item.count || 1 };
    }
    if (normFile.includes(normDec)) {
      return { decimal: dec, count: item.count || 1 };
    }
  }

  if (extracted) {
    return { decimal: extracted, count: 0 };
  }
  return null;
}

function findModelMatch(
  fileName: string,
  modelList: { model: string; count?: number }[]
): { model: string; count: number } | null {
  const normFile = normalize(fileName);
  const sorted = [...modelList]
    .filter((m) => m.model && m.model.trim().length >= 2)
    .sort((a, b) => b.model.trim().length - a.model.trim().length);

  for (const item of sorted) {
    const m = item.model.trim();
    const pattern = new RegExp(`(?:^|[^а-яa-z0-9])${escapeRegex(m)}(?:$|[^а-яa-z0-9])`, 'i');
    if (pattern.test(fileName)) {
      return { model: m, count: item.count || 1 };
    }
    const normM = normalize(m);
    if (normM.length >= 3 && normFile.includes(normM)) {
      return { model: m, count: item.count || 1 };
    }
  }
  return null;
}

function findEquipmentMatch(
  fileName: string,
  equipments?: DocumentMatchTargetEquipment[]
): DocumentMatchTargetEquipment | null {
  if (!equipments || equipments.length === 0) return null;
  const normFile = normalize(fileName);

  for (const eq of equipments) {
    const inv = (eq.inventoryNumber || '').trim();
    if (inv && inv.length >= 3) {
      const invPattern = new RegExp(`(?:^|[^а-яa-z0-9])${escapeRegex(inv)}(?:$|[^а-яa-z0-9])`, 'i');
      if (invPattern.test(fileName) || normFile.includes(normalize(inv))) {
        return eq;
      }
    }
    const sn = (eq.serialNumber || '').trim();
    if (sn && sn.length >= 4) {
      if (fileName.toLowerCase().includes(sn.toLowerCase())) {
        return eq;
      }
    }
  }
  return null;
}

/**
 * Главный метод сопоставления загружаемого документа с реестром оборудования.
 */
export function matchFileNameToTargets(
  fileName: string,
  targets: BindingTargetsCatalog
): DocumentMatchResult {
  const docTypeInfo = detectDocumentTypeFromFileName(fileName);
  const decimalMatch = findDecimalMatch(fileName, targets.decimalNumbers || []);
  const modelMatch = findModelMatch(fileName, targets.models || []);
  const equipmentMatch = findEquipmentMatch(fileName, targets.equipmentList);

  let suggestedBindingMode: 'DECIMAL' | 'MODEL' | 'EQUIPMENT' | null = null;
  let matchReason: string | null = null;
  let matchingEquipmentCount = 0;
  let confidence: 'high' | 'medium' | 'none' = 'none';

  if (decimalMatch && decimalMatch.count > 0) {
    suggestedBindingMode = 'DECIMAL';
    matchingEquipmentCount = decimalMatch.count;
    matchReason = `Найден децимальный номер «${decimalMatch.decimal}» (${decimalMatch.count} ед. оборудования в реестре)`;
    confidence = 'high';
  } else if (modelMatch && modelMatch.count > 0) {
    suggestedBindingMode = 'MODEL';
    matchingEquipmentCount = modelMatch.count;
    matchReason = `Найдена модель «${modelMatch.model}» (${modelMatch.count} ед. оборудования в реестре)`;
    confidence = 'high';
  } else if (equipmentMatch) {
    suggestedBindingMode = 'EQUIPMENT';
    matchingEquipmentCount = 1;
    const label = equipmentMatch.inventoryNumber ? `[${equipmentMatch.inventoryNumber}] ` : '';
    matchReason = `Найдено оборудование ${label}${equipmentMatch.name}`;
    confidence = 'high';
  } else if (decimalMatch) {
    suggestedBindingMode = 'DECIMAL';
    matchReason = `Распознан децимальный номер «${decimalMatch.decimal}» из названия файла`;
    confidence = 'medium';
  }

  return {
    fileName,
    detectedDocType: docTypeInfo.type,
    detectedDocTypeLabel: docTypeInfo.label,
    docTypeConfidence: docTypeInfo.confidence,
    matchedDecimalNumber: decimalMatch?.decimal || null,
    matchedModel: modelMatch?.model || null,
    matchedEquipment: equipmentMatch || null,
    suggestedBindingMode,
    matchingEquipmentCount,
    matchReason,
    confidence,
  };
}

/**
 * Серверный метод сопоставления документа с базой данных Prisma.
 */
export async function matchFileNameWithDatabase(
  fileName: string,
  prismaClient: any
): Promise<DocumentMatchResult> {
  const equipment = await prismaClient.equipment.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      inventoryNumber: true,
      serialNumber: true,
      model: true,
      customFields: true,
    },
  });

  const modelsMap = new Map<string, { model: string; count: number }>();
  const decimalsMap = new Map<string, { decimalNumber: string; count: number }>();
  const candidates: DocumentMatchTargetEquipment[] = [];

  for (const eq of equipment) {
    const dec = getEquipmentDecimalNumber(eq.customFields);
    candidates.push({
      id: eq.id,
      name: eq.name,
      inventoryNumber: eq.inventoryNumber,
      serialNumber: eq.serialNumber,
      model: eq.model,
      decimalNumber: dec || null,
    });

    if (eq.model && eq.model.trim()) {
      const m = eq.model.trim();
      const existing = modelsMap.get(m);
      if (existing) existing.count++;
      else modelsMap.set(m, { model: m, count: 1 });
    }

    if (dec) {
      const existing = decimalsMap.get(dec);
      if (existing) existing.count++;
      else decimalsMap.set(dec, { decimalNumber: dec, count: 1 });
    }
  }

  const catalog: BindingTargetsCatalog = {
    models: Array.from(modelsMap.values()),
    decimalNumbers: Array.from(decimalsMap.values()),
    equipmentList: candidates,
  };

  return matchFileNameToTargets(fileName, catalog);
}
