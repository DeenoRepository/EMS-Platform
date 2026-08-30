import { prisma } from '@ems/database';
import { logger } from '../logger';

export interface JiraFieldMappingItem {
  srmField: string;          // Target SRM field (e.g. 'summary', 'status', 'priority', 'issueType', 'assignee', 'reporter', 'createdDate', 'resolvedDate')
  label: string;             // Human readable name (e.g. 'Тема заявки')
  jiraPath: string;          // Dot-notation path in Jira JSON (e.g. 'fields.summary', 'fields.status.name')
  transformType: 'string' | 'date' | 'number' | 'boolean' | 'json';
  defaultValue?: string;
  isRequired?: boolean;
  description?: string;
}

export interface JiraCustomFieldMappingItem {
  key: string;               // Key in SRM (e.g. 'downtimeHours', 'componentName', 'vendorOrder')
  label: string;             // Human readable name (e.g. 'Время простоя (ч)')
  jiraPath: string;          // Path in Jira JSON (e.g. 'fields.customfield_10025')
  transformType: 'string' | 'date' | 'number' | 'boolean' | 'json';
  defaultValue?: string;
}

export interface EquipmentMatchConfig {
  sourcePath: string;        // e.g. 'fields.customfield_10100' or 'fields.summary'
  matchBy: 'inventoryNumber' | 'serialNumber' | 'name' | 'regex';
  regexPattern?: string;     // e.g. 'ИНВ[-_#]?([0-9A-Z]+)'
}

export interface JiraFieldMappingConfig {
  standardMappings: JiraFieldMappingItem[];
  customMappings: JiraCustomFieldMappingItem[];
  equipmentMatching: EquipmentMatchConfig;
  statusMapping: Record<string, string>;   // Jira status -> SRM normalized status (e.g. 'Done' -> 'Closed')
  priorityMapping: Record<string, string>; // Jira priority -> SRM normalized priority (e.g. 'Highest' -> 'Critical')
}

export const DEFAULT_JIRA_FIELD_MAPPING: JiraFieldMappingConfig = {
  standardMappings: [
    {
      srmField: 'issueKey',
      label: 'Ключ заявки (Issue Key)',
      jiraPath: 'key',
      transformType: 'string',
      isRequired: true,
      description: 'Уникальный идентификатор задачи в Jira (например, EMS-104)',
    },
    {
      srmField: 'summary',
      label: 'Тема / Краткое описание',
      jiraPath: 'fields.summary',
      transformType: 'string',
      isRequired: true,
      defaultValue: 'Без темы',
      description: 'Заголовок или краткая суть инцидента',
    },
    {
      srmField: 'status',
      label: 'Статус заявки',
      jiraPath: 'fields.status.name',
      transformType: 'string',
      isRequired: true,
      defaultValue: 'Open',
      description: 'Текущее состояние задачи (Open, In Progress, Closed и т.д.)',
    },
    {
      srmField: 'priority',
      label: 'Приоритет',
      jiraPath: 'fields.priority.name',
      transformType: 'string',
      isRequired: true,
      defaultValue: 'Medium',
      description: 'Важность задачи (Lowest, Low, Medium, High, Highest)',
    },
    {
      srmField: 'issueType',
      label: 'Тип заявки',
      jiraPath: 'fields.issuetype.name',
      transformType: 'string',
      isRequired: true,
      defaultValue: 'Incident',
      description: 'Тип задачи в Jira (Bug, Task, Incident, Обслуживание)',
    },
    {
      srmField: 'assignee',
      label: 'Исполнитель (ФИО / Login)',
      jiraPath: 'fields.assignee.displayName',
      transformType: 'string',
      isRequired: false,
      defaultValue: '',
      description: 'Ответственный сотрудник за выполнение заявки',
    },
    {
      srmField: 'reporter',
      label: 'Автор заявки',
      jiraPath: 'fields.reporter.displayName',
      transformType: 'string',
      isRequired: false,
      defaultValue: '',
      description: 'Сотрудник, создавший задачу',
    },
    {
      srmField: 'createdDate',
      label: 'Дата создания',
      jiraPath: 'fields.created',
      transformType: 'date',
      isRequired: true,
      description: 'Временная метка регистрации инцидента',
    },
    {
      srmField: 'resolvedDate',
      label: 'Дата закрытия / Решения',
      jiraPath: 'fields.resolutiondate',
      transformType: 'date',
      isRequired: false,
      description: 'Временная метка закрытия заявки для расчета MTTR и соблюдения SLA',
    },
  ],
  customMappings: [
    {
      key: 'downtimeHours',
      label: 'Время простоя (ч)',
      jiraPath: 'fields.customfield_10042',
      transformType: 'number',
      defaultValue: '0',
    },
    {
      key: 'component',
      label: 'Компонент оборудования',
      jiraPath: 'fields.components[0].name',
      transformType: 'string',
      defaultValue: '',
    },
  ],
  equipmentMatching: {
    sourcePath: 'fields.customfield_10100',
    matchBy: 'inventoryNumber',
    regexPattern: '(?:ИНВ|INV|EQ)[-_#]?([A-Za-z0-9-]+)',
  },
  statusMapping: {
    'To Do': 'Open',
    'Open': 'Open',
    'In Progress': 'In Progress',
    'Under Review': 'In Progress',
    'Done': 'Closed',
    'Resolved': 'Closed',
    'Closed': 'Closed',
  },
  priorityMapping: {
    'Lowest': 'Lowest',
    'Low': 'Low',
    'Medium': 'Medium',
    'High': 'High',
    'Highest': 'Highest',
    'Critical': 'Highest',
    'Blocker': 'Highest',
  },
};

const SYSTEM_SETTING_MAPPING_KEY = 'srm_jira_field_mapping';

/**
 * Получение текущей конфигурации маппинга из базы данных
 */
export async function getJiraFieldMapping(): Promise<JiraFieldMappingConfig> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SYSTEM_SETTING_MAPPING_KEY },
    });

    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      return {
        standardMappings: parsed.standardMappings || DEFAULT_JIRA_FIELD_MAPPING.standardMappings,
        customMappings: parsed.customMappings || DEFAULT_JIRA_FIELD_MAPPING.customMappings,
        equipmentMatching: parsed.equipmentMatching || DEFAULT_JIRA_FIELD_MAPPING.equipmentMatching,
        statusMapping: parsed.statusMapping || DEFAULT_JIRA_FIELD_MAPPING.statusMapping,
        priorityMapping: parsed.priorityMapping || DEFAULT_JIRA_FIELD_MAPPING.priorityMapping,
      };
    }
  } catch (error) {
    logger.error('Ошибка чтения конфигурации маппинга Jira, используются дефолтные значения', {
      errorType: error instanceof Error ? error.name : typeof error,
    });
  }

  return DEFAULT_JIRA_FIELD_MAPPING;
}

/**
 * Сохранение обновленной конфигурации маппинга в базу данных
 */
export async function saveJiraFieldMapping(config: JiraFieldMappingConfig): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: SYSTEM_SETTING_MAPPING_KEY },
    update: {
      value: JSON.stringify(config),
      description: 'Конфигурация сопоставления полей Jira с SRM',
      updatedAt: new Date(),
    },
    create: {
      key: SYSTEM_SETTING_MAPPING_KEY,
      value: JSON.stringify(config),
      description: 'Конфигурация сопоставления полей Jira с SRM',
    },
  });
}

/**
 * Безопасное извлечение значения из объекта по dot-нотации пути (с поддержкой массивов)
 * Например: 'fields.components[0].name' или 'fields.status.name' или 'key'
 */
export function extractValueByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  // Разбиваем путь на сегменты с учетом индексов массивов: "a.b[0].c" -> ["a", "b", "0", "c"]
  const normalizedPath = path
    .replace(/\[(\w+)\]/g, '.$1')
    .replace(/^\./, '');

  const segments = normalizedPath.split('.');
  let current: any = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

/**
 * Преобразование извлеченного значения в целевой тип
 */
function transformValue(value: any, transformType: JiraFieldMappingItem['transformType'], defaultValue?: string): any {
  if (value === undefined || value === null || value === '') {
    if (defaultValue !== undefined && defaultValue !== '') {
      return defaultValue;
    }
    return null;
  }

  switch (transformType) {
    case 'string':
      return typeof value === 'object' ? JSON.stringify(value) : String(value).trim();
    case 'number':
      const num = Number(value);
      return isNaN(num) ? (defaultValue ? Number(defaultValue) : 0) : num;
    case 'boolean':
      return Boolean(value);
    case 'date':
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    case 'json':
      return value;
    default:
      return value;
  }
}

export interface JiraIssueData {
  issueKey: string;
  summary: string;
  status: string;
  priority: string;
  issueType: string;
  assignee: string | null;
  reporter: string | null;
  createdDate: Date;
  resolvedDate: Date | null;
  equipmentId?: string | null;
  rawData: any;
  customFields?: Record<string, any>;
}

interface EquipmentCacheItem {
  id: string;
  name: string;
  inventoryNumber: string | null;
  serialNumber: string | null;
}

function mapStandardFields(rawIssue: any, config: JiraFieldMappingConfig): Record<string, any> {
  const result: Record<string, any> = {};

  for (const mapping of config.standardMappings) {
    const rawValue = extractValueByPath(rawIssue, mapping.jiraPath);
    let value = transformValue(rawValue, mapping.transformType, mapping.defaultValue);

    if (mapping.srmField === 'status' && value && config.statusMapping?.[value]) {
      value = config.statusMapping[value];
    }
    if (mapping.srmField === 'priority' && value && config.priorityMapping?.[value]) {
      value = config.priorityMapping[value];
    }

    result[mapping.srmField] = value;
  }

  return {
    ...result,
    issueKey: result.issueKey || rawIssue.key || `MOCK-${Date.now()}`,
    summary: result.summary || 'Без темы',
    status: result.status || 'Open',
    priority: result.priority || 'Medium',
    issueType: result.issueType || 'Incident',
    createdDate: result.createdDate || new Date(),
  };
}

function mapCustomFields(rawIssue: any, mappings: JiraCustomFieldMappingItem[]): Record<string, any> {
  return mappings.reduce<Record<string, any>>((customFields, mapping) => {
    const rawValue = extractValueByPath(rawIssue, mapping.jiraPath);
    customFields[mapping.key] = transformValue(rawValue, mapping.transformType, mapping.defaultValue);
    return customFields;
  }, {});
}

function extractEquipmentSearchValue(rawIssue: any, config: EquipmentMatchConfig): string {
  const rawValue = extractValueByPath(rawIssue, config.sourcePath);
  let searchValue = rawValue ? String(rawValue).trim() : '';

  if (searchValue && config.matchBy === 'regex' && config.regexPattern) {
    try {
      const match = searchValue.match(new RegExp(config.regexPattern, 'i'));
      if (match?.[1]) searchValue = match[1].trim();
    } catch (error) {
      logger.warn('Ошибка выполнения regex для сопоставления оборудования', {
        errorType: error instanceof Error ? error.name : typeof error,
      });
    }
  }

  return searchValue;
}

function isMatchingEquipment(equipment: EquipmentCacheItem, matchBy: EquipmentMatchConfig['matchBy'], searchValue: string): boolean {
  const normalizedSearchValue = searchValue.toLowerCase();

  if (matchBy === 'inventoryNumber' || matchBy === 'regex') {
    return Boolean(equipment.inventoryNumber && equipment.inventoryNumber.toLowerCase() === normalizedSearchValue);
  }
  if (matchBy === 'serialNumber' && equipment.serialNumber) {
    return equipment.serialNumber.toLowerCase() === normalizedSearchValue;
  }
  return matchBy === 'name' && equipment.name.toLowerCase().includes(normalizedSearchValue);
}

async function resolveMatchedEquipmentId(
  rawIssue: any,
  config: EquipmentMatchConfig,
  equipmentCache?: EquipmentCacheItem[]
): Promise<string | null> {
  const searchValue = extractEquipmentSearchValue(rawIssue, config);
  if (!searchValue) return null;

  if (equipmentCache) {
    return equipmentCache.find((equipment) => isMatchingEquipment(equipment, config.matchBy, searchValue))?.id || null;
  }

  const equipment = await prisma.equipment.findFirst({
    where: {
      OR: [
        { inventoryNumber: { equals: searchValue, mode: 'insensitive' } },
        { serialNumber: { equals: searchValue, mode: 'insensitive' } },
        { name: { contains: searchValue, mode: 'insensitive' } },
      ],
    },
  });

  return equipment?.id || null;
}

/**
 * Применение конфигурации сопоставления к сырому объекту задачи из Jira
 */
export async function applyJiraFieldMapping(
  rawIssue: any,
  config: JiraFieldMappingConfig,
  equipmentCache?: EquipmentCacheItem[]
): Promise<JiraIssueData> {
  const standardFields = mapStandardFields(rawIssue, config);
  const customFields = mapCustomFields(rawIssue, config.customMappings || []);
  const equipmentId = config.equipmentMatching?.sourcePath
    ? await resolveMatchedEquipmentId(rawIssue, config.equipmentMatching, equipmentCache)
    : null;

  return {
    ...standardFields,
    rawData: rawIssue,
    customFields,
    equipmentId,
  } as JiraIssueData;
}

/**
 * Тестирование схемы сопоставления на образце JSON
 */
export async function testJiraFieldMapping(
  sampleIssue: any,
  config: JiraFieldMappingConfig
): Promise<{ success: boolean; mapped: JiraIssueData; customFields: Record<string, any>; diagnostics: string[] }> {
  const diagnostics: string[] = [];

  if (!sampleIssue || typeof sampleIssue !== 'object') {
    return {
      success: false,
      mapped: {} as any,
      customFields: {},
      diagnostics: ['Передан некорректный JSON объект задачи Jira'],
    };
  }

  const equipmentList: Array<{
    id: string;
    name: string;
    inventoryNumber: string | null;
    serialNumber: string | null;
  }> = await prisma.equipment.findMany({
    select: { id: true, name: true, inventoryNumber: true, serialNumber: true },
    take: 50,
  });

  const mapped = await applyJiraFieldMapping(sampleIssue, config, equipmentList);

  for (const std of config.standardMappings) {
    const rawVal = extractValueByPath(sampleIssue, std.jiraPath);
    if (rawVal === undefined || rawVal === null) {
      diagnostics.push(`Поле "${std.label}" (${std.jiraPath}) не найдено в переданном JSON, применено значение по умолчанию: "${std.defaultValue || '—'}"`);
    }
  }

  if (mapped.equipmentId) {
    const matchedEq = equipmentList.find((e) => e.id === mapped.equipmentId);
    diagnostics.push(`Оборудование успешно сопоставлено: [${matchedEq?.inventoryNumber}] ${matchedEq?.name}`);
  } else {
    diagnostics.push(`Оборудование не найдено по правилу (${config.equipmentMatching.matchBy} в ${config.equipmentMatching.sourcePath})`);
  }

  return {
    success: true,
    mapped,
    customFields: mapped.customFields || {},
    diagnostics,
  };
}
