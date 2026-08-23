import { prisma } from '@ems/database';
import { getSystemSettings } from './system-settings-service';

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

  const equipmentList = await prisma.equipment.findMany({
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

/**
 * Унифицированная функция синхронизации задач с внешними системами (Jira, Redmine, GitLab, REST API)
 */
export async function syncJiraIssues(targetIntegrationId?: string): Promise<{ count: number; source: string }> {
  const allEquipment = await prisma.equipment.findMany({
    select: { id: true, name: true, inventoryNumber: true, serialNumber: true },
  });

  const defaultGlobalMapping = await getJiraFieldMapping();

  // 1. Проверяем наличие настроенных интеграций в базе данных
  const integrationWhere: any = { isActive: true };
  if (targetIntegrationId) {
    integrationWhere.id = targetIntegrationId;
  }

  const integrations = await prisma.srmIntegration.findMany({
    where: integrationWhere,
  });

  if (integrations.length > 0) {
    const { getSrmAdapter } = await import('./srm-providers');
    let totalImported = 0;

    for (const integration of integrations) {
      try {
        const adapter = getSrmAdapter(integration.providerType);
        const rawIssues = await adapter.fetchIssues(integration);

        const mappingConfig = (integration.mappingConfig as unknown as JiraFieldMappingConfig) || defaultGlobalMapping;

        for (const rawIssue of rawIssues) {
          const mapped = await applyJiraFieldMapping(rawIssue, mappingConfig, allEquipment);

          await prisma.jiraIssueCache.upsert({
            where: { issueKey: mapped.issueKey },
            create: {
              issueKey: mapped.issueKey,
              summary: mapped.summary,
              status: mapped.status,
              priority: mapped.priority,
              issueType: mapped.issueType,
              assignee: mapped.assignee,
              reporter: mapped.reporter,
              createdDate: mapped.createdDate,
              resolvedDate: mapped.resolvedDate,
              equipmentId: mapped.equipmentId,
              integrationId: integration.id,
              rawData: rawIssue,
              syncedAt: new Date(),
            },
            update: {
              summary: mapped.summary,
              status: mapped.status,
              priority: mapped.priority,
              issueType: mapped.issueType,
              assignee: mapped.assignee,
              reporter: mapped.reporter,
              createdDate: mapped.createdDate,
              resolvedDate: mapped.resolvedDate,
              equipmentId: mapped.equipmentId,
              integrationId: integration.id,
              rawData: rawIssue,
              syncedAt: new Date(),
            },
          });
          totalImported++;
        }

        await prisma.srmIntegration.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'SUCCESS',
            lastSyncError: null,
          },
        });
      } catch (err: any) {
        console.error(`Ошибка синхронизации интеграции [${integration.name}]:`, err);
        await prisma.srmIntegration.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'ERROR',
            lastSyncError: err.message || String(err),
          },
        });
      }
    }

    return { count: totalImported, source: 'srm_integrations' };
  }

  // 2. Fallback на системные параметры из БД / .env (legacy Jira)
  const sysSettings = await getSystemSettings();
  const isJiraEnabled = process.env.JIRA_ENABLED === 'true' || Boolean(sysSettings.JIRA_BASE_URL);
  const baseUrl = sysSettings.JIRA_BASE_URL || process.env.JIRA_BASE_URL || process.env.JIRA_HOST;
  const apiToken = process.env.JIRA_API_TOKEN;
  const userEmail = process.env.JIRA_USER_EMAIL || process.env.JIRA_EMAIL;
  const projectKey = sysSettings.JIRA_PROJECT_KEY || process.env.JIRA_PROJECT_KEY || 'EMS';

  if (isJiraEnabled && baseUrl && apiToken && userEmail) {
    try {
      const authHeader = `Basic ${Buffer.from(`${userEmail}:${apiToken}`).toString('base64')}`;
      const res = await fetch(`${baseUrl}/rest/api/2/search?jql=project=${projectKey} ORDER BY created DESC`, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        const issues: any[] = data.issues || [];

        for (const issue of issues) {
          const mapped = await applyJiraFieldMapping(issue, defaultGlobalMapping, allEquipment);

          await prisma.jiraIssueCache.upsert({
            where: { issueKey: mapped.issueKey },
            create: {
              issueKey: mapped.issueKey,
              summary: mapped.summary,
              status: mapped.status,
              priority: mapped.priority,
              issueType: mapped.issueType,
              assignee: mapped.assignee,
              reporter: mapped.reporter,
              createdDate: mapped.createdDate,
              resolvedDate: mapped.resolvedDate,
              equipmentId: mapped.equipmentId,
              rawData: issue,
              syncedAt: new Date(),
            },
            update: {
              summary: mapped.summary,
              status: mapped.status,
              priority: mapped.priority,
              issueType: mapped.issueType,
              assignee: mapped.assignee,
              reporter: mapped.reporter,
              createdDate: mapped.createdDate,
              resolvedDate: mapped.resolvedDate,
              equipmentId: mapped.equipmentId,
              rawData: issue,
              syncedAt: new Date(),
            },
          });
        }

        return { count: issues.length, source: 'jira_env_api' };
      }
    } catch (err) {
      console.warn('Не удалось подключиться к Jira по .env, переход в локальный fallback:', err);
    }
  }

  // 2. Fallback / Dev режим: генерация и поддержание кэша для оборудования
  const existingCount = await prisma.jiraIssueCache.count();
  if (existingCount === 0) {
    const equipment = await prisma.equipment.findMany({ take: 5 });
    const mockIssues: JiraIssueData[] = [
      {
        issueKey: 'EMS-101',
        summary: 'Вибрация в подшипниковом узле главного привода',
        status: 'Closed',
        priority: 'High',
        issueType: 'Аварийный ремонт',
        assignee: 'Иванов И.И.',
        reporter: 'Петров П.П.',
        createdDate: new Date(Date.now() - 14 * 24 * 3600 * 1000),
        resolvedDate: new Date(Date.now() - 13 * 24 * 3600 * 1000),
        equipmentId: equipment[0]?.id || null,
        rawData: { description: 'Замена смазки и протяжка болтов крепления' },
      },
      {
        issueKey: 'EMS-102',
        summary: 'Перегрев электродвигателя насоса охлаждения',
        status: 'In Progress',
        priority: 'Highest',
        issueType: 'Инженерная заявка',
        assignee: 'Сидоров С.С.',
        reporter: 'Иванов И.И.',
        createdDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        resolvedDate: null,
        equipmentId: equipment[1]?.id || equipment[0]?.id || null,
        rawData: { description: 'Диагностика изоляции обмоток' },
      },
      {
        issueKey: 'EMS-103',
        summary: 'Утечка гидравлического масла в контуре высокого давления',
        status: 'Closed',
        priority: 'Medium',
        issueType: 'Аварийный ремонт',
        assignee: 'Иванов И.И.',
        reporter: 'Козлов К.К.',
        createdDate: new Date(Date.now() - 25 * 24 * 3600 * 1000),
        resolvedDate: new Date(Date.now() - 24 * 24 * 3600 * 1000),
        equipmentId: equipment[2]?.id || equipment[0]?.id || null,
        rawData: { description: 'Замена уплотнительного кольца и штуцера' },
      },
      {
        issueKey: 'EMS-104',
        summary: 'Калибровка датчиков давления и расходомеров',
        status: 'Open',
        priority: 'Low',
        issueType: 'Плановое ТО',
        assignee: null,
        reporter: 'Петров П.П.',
        createdDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
        resolvedDate: null,
        equipmentId: equipment[0]?.id || null,
        rawData: { description: 'Плановая метрологическая поверка' },
      },
      {
        issueKey: 'EMS-105',
        summary: 'Сбой позиционирования сервопривода подачи',
        status: 'Closed',
        priority: 'High',
        issueType: 'Аварийный ремонт',
        assignee: 'Сидоров С.С.',
        reporter: 'Иванов И.И.',
        createdDate: new Date(Date.now() - 40 * 24 * 3600 * 1000),
        resolvedDate: new Date(Date.now() - 39 * 24 * 3600 * 1000),
        equipmentId: equipment[1]?.id || equipment[0]?.id || null,
        rawData: { description: 'Очистка энкодера и перенастройка нулевой точки' },
      },
    ];

    for (const item of mockIssues) {
      await prisma.jiraIssueCache.create({
        data: {
          issueKey: item.issueKey,
          summary: item.summary,
          status: item.status,
          priority: item.priority,
          issueType: item.issueType,
          assignee: item.assignee,
          reporter: item.reporter,
          createdDate: item.createdDate,
          resolvedDate: item.resolvedDate,
          equipmentId: item.equipmentId,
          rawData: item.rawData,
        },
      });
    }

    return { count: mockIssues.length, source: 'mock_cache' };
  }

  return { count: existingCount, source: 'mock_cache' };
}

/**
 * Расчет статистических метрик надежности (MTTR, MTBF, SLA)
 */
export async function calculateSrmMetrics(equipmentId?: string): Promise<{
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  mttrHours: number;
  mtbfDays: number;
  slaComplianceRate: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
}> {
  const where: any = {};
  if (equipmentId) {
    where.equipmentId = equipmentId;
  }

  const issues = await prisma.jiraIssueCache.findMany({
    where,
    orderBy: { createdDate: 'asc' },
  });

  const totalIssues = issues.length;
  let openIssues = 0;
  let inProgressIssues = 0;
  let resolvedIssues = 0;

  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};

  let totalResolutionTimeHours = 0;
  let resolvedCount = 0;
  let slaMetCount = 0;
  const SLA_TARGET_HOURS = 48;

  for (const issue of issues) {
    statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
    priorityCounts[issue.priority] = (priorityCounts[issue.priority] || 0) + 1;

    const lowerStatus = issue.status.toLowerCase();
    if (
      lowerStatus.includes('closed') ||
      lowerStatus.includes('resolved') ||
      lowerStatus.includes('done') ||
      lowerStatus.includes('решен') ||
      lowerStatus.includes('готов') ||
      lowerStatus.includes('закрыт')
    ) {
      resolvedIssues++;
      if (issue.resolvedDate) {
        const diffMs = issue.resolvedDate.getTime() - issue.createdDate.getTime();
        const diffHours = Math.max(0, diffMs / (1000 * 60 * 60));
        totalResolutionTimeHours += diffHours;
        resolvedCount++;

        if (diffHours <= SLA_TARGET_HOURS) {
          slaMetCount++;
        }
      }
    } else if (
      lowerStatus.includes('progress') ||
      lowerStatus.includes('in work') ||
      lowerStatus.includes('review') ||
      lowerStatus.includes('процесс') ||
      lowerStatus.includes('работе')
    ) {
      inProgressIssues++;
    } else {
      openIssues++;
    }
  }

  const mttrHours = resolvedCount > 0 ? Math.round((totalResolutionTimeHours / resolvedCount) * 10) / 10 : 0;
  const slaComplianceRate = resolvedCount > 0 ? Math.round((slaMetCount / resolvedCount) * 100) : 100;

  let mtbfDays = 0;
  if (issues.length > 1) {
    const firstDate = issues[0].createdDate.getTime();
    const lastDate = issues[issues.length - 1].createdDate.getTime();
    const spanDays = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
    mtbfDays = Math.round((spanDays / issues.length) * 10) / 10;
  } else {
    mtbfDays = 30.0;
  }

  return {
    totalIssues,
    openIssues,
    inProgressIssues,
    resolvedIssues,
    mttrHours,
    mtbfDays,
    slaComplianceRate,
    statusCounts,
    priorityCounts,
  };
}

export const calculateSrmStats = calculateSrmMetrics;

/**
 * Отправка системного уведомления при поступлении критического инцидента или риска срыва SLA
 */
export async function notifySrmIncident(issue: JiraIssueData, equipmentName?: string) {
  try {
    const priority = (issue.priority || '').toLowerCase();
    const isCritical = ['highest', 'critical', 'blocker', 'high'].includes(priority);
    const createdMs = issue.createdDate ? new Date(issue.createdDate).getTime() : Date.now();
    const isPastSla = !issue.resolvedDate && (Date.now() - createdMs) > 48 * 3600 * 1000;

    if (!isCritical && !isPastSla) return;

    // Находим активных пользователей с правами инженера / администратора
    const targetUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            role: {
              permissions: {
                some: {
                  permission: {
                    code: {
                      in: ['srm.dashboard.view', 'srm.sync.trigger', 'admin.users.manage'],
                    },
                  },
                },
              },
            },
          },
        },
      },
      select: { id: true },
      take: 10,
    });

    if (targetUsers.length === 0) return;

    const title = isPastSla
      ? `Риск срыва SLA: заявка ${issue.issueKey}`
      : `Критический инцидент: ${issue.issueKey}`;

    const message = isPastSla
      ? `Заявка «${issue.summary}» ${equipmentName ? `по оборудованию «${equipmentName}»` : ''} находится в работе без решения более регламентного срока SLA.`
      : `Зарегистрирован аварийный инцидент [${issue.priority}]: «${issue.summary}» ${equipmentName ? `(${equipmentName})` : ''}.`;

    for (const u of targetUsers) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          title,
          message,
          type: 'SLA_BREACH',
          link: `/srm?tab=issues&search=${issue.issueKey}`,
        },
      });
    }
  } catch (err) {
    console.warn('Ошибка отправки уведомления об инциденте SRM:', err);
  }
}

/**
 * Создание внутренней сервисной заявки (Internal Service Request) в SRM 2.0
 */
export async function createInternalServiceRequest(data: {
  summary: string;
  description?: string;
  priority: string;
  issueType?: string;
  failureCategory?: string;
  equipmentId?: string;
  reporter?: string;
  createdById?: string;
  assignee?: string;
  warrantyClaim?: boolean;
  contractorName?: string;
}): Promise<any> {
  const currentYear = new Date().getFullYear();
  
  // Генерация уникального номера заявки: INC-YYYY-XXXX
  const latestIssue = await prisma.jiraIssueCache.findFirst({
    where: {
      issueKey: {
        startsWith: `INC-${currentYear}-`,
      },
    },
    orderBy: { createdDate: 'desc' },
  });

  let nextNum = 1;
  if (latestIssue && latestIssue.issueKey) {
    const parts = latestIssue.issueKey.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
  }
  const issueKey = `INC-${currentYear}-${String(nextNum).padStart(4, '0')}`;

  // Расчет нормативного дедлайна по SLA
  const now = new Date();
  let slaHours = 24; // по умолчанию 24ч (Medium)
  const normPriority = (data.priority || 'MEDIUM').toUpperCase();
  if (normPriority === 'CRITICAL' || normPriority === 'HIGHEST') slaHours = 4;
  else if (normPriority === 'HIGH') slaHours = 12;
  else if (normPriority === 'LOW' || normPriority === 'LOWEST') slaHours = 72;

  const slaDeadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

  // Создаем запись инцидента
  const issue = await prisma.jiraIssueCache.create({
    data: {
      issueKey,
      summary: data.summary,
      description: data.description || null,
      status: 'OPEN',
      priority: normPriority,
      issueType: data.issueType || 'INCIDENT',
      source: 'INTERNAL',
      failureCategory: data.failureCategory || 'OTHER',
      slaDeadline,
      slaBreached: false,
      warrantyClaim: Boolean(data.warrantyClaim),
      contractorName: data.contractorName || null,
      equipmentId: data.equipmentId || null,
      reporter: data.reporter || 'Оператор EMS',
      createdById: data.createdById || null,
      assignee: data.assignee || null,
      createdDate: now,
      rawData: {
        submittedVia: 'EMS Web UI',
        userNotes: data.description || '',
      },
    },
  });

  // Если инцидент критический и указано оборудование - переводим оборудование в статус UNDER_REPAIR в EPS
  if (data.equipmentId && (normPriority === 'CRITICAL' || normPriority === 'HIGH')) {
    try {
      await prisma.equipment.update({
        where: { id: data.equipmentId },
        data: { status: 'UNDER_REPAIR' },
      });
    } catch (e) {
      console.warn('Не удалось обновить статус оборудования в EPS:', e);
    }
  }

  // Отправляем уведомление ответственным лицам
  try {
    let eqName: string | undefined;
    if (data.equipmentId) {
      const eq = await prisma.equipment.findUnique({ where: { id: data.equipmentId }, select: { name: true } });
      eqName = eq?.name;
    }
    await notifySrmIncident(
      {
        issueKey,
        summary: data.summary,
        status: 'OPEN',
        priority: normPriority,
        issueType: data.issueType || 'INCIDENT',
        assignee: data.assignee || null,
        reporter: data.reporter || null,
        createdDate: now,
        resolvedDate: null,
        rawData: {},
      },
      eqName
    );
  } catch (e) {
    console.warn('Ошибка при отправке оповещения SRM:', e);
  }

  return issue;
}

/**
 * Создание аварийного заказ-наряда MRO на основе инцидента SRM
 */
export async function createMroWorkOrderFromIssue(issueId: string, userId?: string): Promise<any> {
  const issue = await prisma.jiraIssueCache.findUnique({
    where: { id: issueId },
  });

  if (!issue) {
    throw new Error('Инцидент не найден');
  }

  if (!issue.equipmentId) {
    throw new Error('Невозможно создать заказ-наряд ТОиР: к заявке не привязано оборудование');
  }

  // Создаем заказ-наряд в MRO
  const schedule = await prisma.maintenanceSchedule.create({
    data: {
      equipmentId: issue.equipmentId,
      title: `Аварийный ремонт по заявке ${issue.issueKey}: ${issue.summary}`,
      scheduledDate: new Date(),
      status: 'IN_PROGRESS',
      notes: `Создано автоматически из модуля SRM (ServiceDesk). Приоритет: ${issue.priority}. Категория отказа: ${issue.failureCategory || 'Не указана'}. ${issue.description ? `\nОписание: ${issue.description}` : ''}`,
      jiraIssueKey: issue.issueKey,
    },
  });

  // Обновляем заявку SRM: статус IN_PROGRESS, связь с нарядом MRO
  const updatedIssue = await prisma.jiraIssueCache.update({
    where: { id: issueId },
    data: {
      status: 'IN_PROGRESS',
      mroScheduleId: schedule.id,
    },
  });

  // Убеждаемся, что оборудование имеет статус UNDER_REPAIR
  await prisma.equipment.update({
    where: { id: issue.equipmentId },
    data: { status: 'UNDER_REPAIR' },
  });

  return { schedule, issue: updatedIssue };
}

/**
 * Расширенный расчет аналитики надежности RAMS и RCM
 */
export async function calculateAdvancedRamsMetrics(equipmentId?: string) {
  const where: any = {};
  if (equipmentId) {
    where.equipmentId = equipmentId;
  }

  const issues = await prisma.jiraIssueCache.findMany({
    where,
    orderBy: { createdDate: 'asc' },
  });

  const totalIncidents = issues.length;
  let resolvedCount = 0;
  let totalDowntimeHours = 0;
  let totalRepairTimeHours = 0;
  let slaMetCount = 0;

  const failureCategoryCounts: Record<string, number> = {
    MECHANICAL: 0,
    ELECTRICAL: 0,
    HYDRAULIC: 0,
    SOFTWARE: 0,
    OPERATOR_ERROR: 0,
    WEAR: 0,
    OTHER: 0,
  };

  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  const equipmentBreakdown: Record<string, { name: string; count: number; downtimeHours: number }> = {};

  const eqIds = issues.map((i) => i.equipmentId).filter(Boolean) as string[];
  const equipments = await prisma.equipment.findMany({
    where: { id: { in: eqIds } },
    select: { id: true, name: true, inventoryNumber: true },
  });
  const eqMap = new Map(equipments.map((e) => [e.id, e]));

  for (const issue of issues) {
    // Статусы
    statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
    priorityCounts[issue.priority] = (priorityCounts[issue.priority] || 0) + 1;
    sourceCounts[issue.source || 'JIRA'] = (sourceCounts[issue.source || 'JIRA'] || 0) + 1;

    // Категория отказа
    const cat = issue.failureCategory || 'OTHER';
    failureCategoryCounts[cat] = (failureCategoryCounts[cat] || 0) + 1;

    // Оборудование
    if (issue.equipmentId) {
      const eq = eqMap.get(issue.equipmentId);
      const eqName = eq ? `[${eq.inventoryNumber || '—'}] ${eq.name}` : 'Неизвестное оборудование';
      if (!equipmentBreakdown[issue.equipmentId]) {
        equipmentBreakdown[issue.equipmentId] = { name: eqName, count: 0, downtimeHours: 0 };
      }
      equipmentBreakdown[issue.equipmentId].count += 1;
    }

    // Расчет времени восстановления и простоя
    const isResolved = ['CLOSED', 'RESOLVED', 'DONE', 'РЕШЕН', 'ГОТОВ', 'ЗАКРЫТ'].some((s) =>
      issue.status.toUpperCase().includes(s)
    );

    if (isResolved && issue.resolvedDate) {
      resolvedCount++;
      const durationHours = Math.max(0, (issue.resolvedDate.getTime() - issue.createdDate.getTime()) / (1000 * 3600));
      totalRepairTimeHours += durationHours;

      const downtime = issue.downtimeMinutes ? issue.downtimeMinutes / 60 : durationHours;
      totalDowntimeHours += downtime;

      if (issue.equipmentId && equipmentBreakdown[issue.equipmentId]) {
        equipmentBreakdown[issue.equipmentId].downtimeHours += downtime;
      }

      // Проверка SLA
      if (issue.slaDeadline) {
        if (issue.resolvedDate <= issue.slaDeadline) slaMetCount++;
      } else {
        if (durationHours <= 48) slaMetCount++;
      }
    }
  }

  // MTTR (Mean Time To Repair) в часах
  const mttrHours = resolvedCount > 0 ? Math.round((totalRepairTimeHours / resolvedCount) * 10) / 10 : 4.2;

  // MTBF (Mean Time Between Failures) в днях
  let mtbfDays = 45.0;
  if (issues.length > 1) {
    const firstTime = issues[0].createdDate.getTime();
    const lastTime = issues[issues.length - 1].createdDate.getTime();
    const totalDays = Math.max(1, (lastTime - firstTime) / (1000 * 3600 * 24));
    mtbfDays = Math.round((totalDays / issues.length) * 10) / 10;
  }

  // КТГ (Коэффициент технической готовности / Availability %)
  // КТГ = MTBF / (MTBF + MTTR_in_days) * 100%
  const mttrDays = mttrHours / 24;
  const availabilityPercent = Math.min(99.9, Math.max(80.0, Math.round((mtbfDays / (mtbfDays + mttrDays)) * 1000) / 10));

  // Соблюдение SLA %
  const slaComplianceRate = resolvedCount > 0 ? Math.round((slaMetCount / resolvedCount) * 100) : 96;

  // Парето-анализ: Сортировка категорий отказов по частоте и накопленный процент
  const sortedCategories = Object.entries(failureCategoryCounts)
    .map(([cat, count]) => ({ category: cat, count }))
    .sort((a, b) => b.count - a.count);

  let cumulativeCount = 0;
  const paretoAnalysis = sortedCategories.map((item) => {
    cumulativeCount += item.count;
    const cumulativePercent = totalIncidents > 0 ? Math.round((cumulativeCount / totalIncidents) * 100) : 0;
    return {
      category: item.category,
      count: item.count,
      cumulativePercent,
    };
  });

  // ТОП-10 проблемного оборудования
  const topEquipment = Object.values(equipmentBreakdown)
    .sort((a, b) => b.count - a.count || b.downtimeHours - a.downtimeHours)
    .slice(0, 10);

  // Гарантийные заявки
  const warrantyIncidentsCount = issues.filter((i) => i.warrantyClaim).length;

  return {
    totalIncidents,
    resolvedCount,
    openCount: totalIncidents - resolvedCount,
    mttrHours,
    mtbfDays,
    availabilityPercent,
    slaComplianceRate,
    totalDowntimeHours: Math.round(totalDowntimeHours * 10) / 10,
    failureCategoryCounts,
    statusCounts,
    priorityCounts,
    sourceCounts,
    paretoAnalysis,
    topEquipment,
    warrantyIncidentsCount,
  };
}


