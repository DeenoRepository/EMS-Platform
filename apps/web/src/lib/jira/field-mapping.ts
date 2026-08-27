import { prisma } from '@ems/database';

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
    console.error('Ошибка чтения конфигурации маппинга Jira, используются дефолтные значения:', error);
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

/**
 * Применение конфигурации сопоставления к сырому объекту задачи из Jira
 */
export async function applyJiraFieldMapping(
  rawIssue: any,
  config: JiraFieldMappingConfig,
  equipmentCache?: Array<{ id: string; name: string; inventoryNumber: string | null; serialNumber: string | null }>
): Promise<JiraIssueData> {
  const result: any = {
    rawData: rawIssue,
    customFields: {},
  };

  // 1. Стандартные поля
  for (const mapping of config.standardMappings) {
    const rawVal = extractValueByPath(rawIssue, mapping.jiraPath);
    let val = transformValue(rawVal, mapping.transformType, mapping.defaultValue);

    // Нормализация через словари статусов/приоритетов
    if (mapping.srmField === 'status' && val && config.statusMapping && config.statusMapping[val]) {
      val = config.statusMapping[val];
    }
    if (mapping.srmField === 'priority' && val && config.priorityMapping && config.priorityMapping[val]) {
      val = config.priorityMapping[val];
    }

    result[mapping.srmField] = val;
  }

  // Дефолты обязательных полей если не были извлечены
  if (!result.issueKey) result.issueKey = rawIssue.key || `MOCK-${Date.now()}`;
  if (!result.summary) result.summary = 'Без темы';
  if (!result.status) result.status = 'Open';
  if (!result.priority) result.priority = 'Medium';
  if (!result.issueType) result.issueType = 'Incident';
  if (!result.createdDate) result.createdDate = new Date();

  // 2. Кастомные поля
  if (config.customMappings && Array.isArray(config.customMappings)) {
    for (const custom of config.customMappings) {
      const rawVal = extractValueByPath(rawIssue, custom.jiraPath);
      result.customFields[custom.key] = transformValue(rawVal, custom.transformType, custom.defaultValue);
    }
  }

  // 3. Сопоставление оборудования
  let matchedEquipmentId: string | null = null;
  const eqConfig = config.equipmentMatching;

  if (eqConfig && eqConfig.sourcePath) {
    const rawEqVal = extractValueByPath(rawIssue, eqConfig.sourcePath);
    let searchVal = rawEqVal ? String(rawEqVal).trim() : '';

    // Если указано регулярное выражение
    if (searchVal && eqConfig.matchBy === 'regex' && eqConfig.regexPattern) {
      try {
        const reg = new RegExp(eqConfig.regexPattern, 'i');
        const match = searchVal.match(reg);
        if (match && match[1]) {
          searchVal = match[1].trim();
        }
      } catch (e) {
        console.warn('Ошибка выполнения regex для сопоставления оборудования:', e);
      }
    }

    if (searchVal) {
      if (equipmentCache) {
        const found = equipmentCache.find((e) => {
          if (eqConfig.matchBy === 'inventoryNumber' || eqConfig.matchBy === 'regex') {
            return Boolean(e.inventoryNumber && e.inventoryNumber.toLowerCase() === searchVal.toLowerCase());
          }
          if (eqConfig.matchBy === 'serialNumber' && e.serialNumber) {
            return e.serialNumber.toLowerCase() === searchVal.toLowerCase();
          }
          if (eqConfig.matchBy === 'name') {
            return e.name.toLowerCase().includes(searchVal.toLowerCase());
          }
          return false;
        });
        if (found) matchedEquipmentId = found.id;
      } else {
        const eq = await prisma.equipment.findFirst({
          where: {
            OR: [
              { inventoryNumber: { equals: searchVal, mode: 'insensitive' } },
              { serialNumber: { equals: searchVal, mode: 'insensitive' } },
              { name: { contains: searchVal, mode: 'insensitive' } },
            ],
          },
        });
        if (eq) matchedEquipmentId = eq.id;
      }
    }
  }

  result.equipmentId = matchedEquipmentId;
  return result as JiraIssueData;
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
