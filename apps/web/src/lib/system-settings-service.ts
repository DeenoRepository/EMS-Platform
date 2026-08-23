import { prisma } from '@ems/database';

export interface SystemSettingsConfig {
  APP_NAME: string;
  LDAP_URL: string;
  LDAP_SEARCH_BASE: string;
  JIRA_BASE_URL: string;
  JIRA_PROJECT_KEY: string;
  JIRA_EQUIPMENT_CUSTOM_FIELD: string;
}

let cachedSettings: { data: SystemSettingsConfig; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Получение системных настроек из БД с in-memory кешированием и fallback на process.env
 */
export async function getSystemSettings(): Promise<SystemSettingsConfig> {
  const now = Date.now();
  if (cachedSettings && cachedSettings.expiresAt > now) {
    return cachedSettings.data;
  }

  try {
    const records = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    records.forEach((r) => {
      map[r.key] = r.value;
    });

    const config: SystemSettingsConfig = {
      APP_NAME: map['APP_NAME'] || process.env.NEXT_PUBLIC_APP_NAME || 'EMS — Equipment Management System',
      LDAP_URL: map['LDAP_URL'] || process.env.LDAP_URL || '',
      LDAP_SEARCH_BASE: map['LDAP_SEARCH_BASE'] || process.env.LDAP_SEARCH_BASE || 'dc=company,dc=local',
      JIRA_BASE_URL: map['JIRA_BASE_URL'] || process.env.JIRA_BASE_URL || process.env.JIRA_HOST || '',
      JIRA_PROJECT_KEY: map['JIRA_PROJECT_KEY'] || process.env.JIRA_PROJECT_KEY || 'EMS',
      JIRA_EQUIPMENT_CUSTOM_FIELD: map['JIRA_EQUIPMENT_CUSTOM_FIELD'] || process.env.JIRA_EQUIPMENT_CUSTOM_FIELD || 'customfield_10100',
    };

    cachedSettings = {
      data: config,
      expiresAt: now + CACHE_TTL_MS,
    };

    return config;
  } catch (error) {
    console.error('Ошибка чтения SystemSetting из БД, используются fallback-значения:', error);
    return {
      APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'EMS — Equipment Management System',
      LDAP_URL: process.env.LDAP_URL || '',
      LDAP_SEARCH_BASE: process.env.LDAP_SEARCH_BASE || 'dc=company,dc=local',
      JIRA_BASE_URL: process.env.JIRA_BASE_URL || process.env.JIRA_HOST || '',
      JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY || 'EMS',
      JIRA_EQUIPMENT_CUSTOM_FIELD: process.env.JIRA_EQUIPMENT_CUSTOM_FIELD || 'customfield_10100',
    };
  }
}

/**
 * Инвалидация кеша системных настроек
 */
export function invalidateSystemSettingsCache(): void {
  cachedSettings = null;
}
