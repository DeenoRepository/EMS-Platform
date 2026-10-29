import { prisma } from '@ems/database';

export type SrmProviderChoice = 'JIRA' | 'REDMINE' | 'GITLAB' | 'GENERIC_REST' | 'DISABLED';

export interface SystemSettingsConfig {
  APP_NAME: string;
  LDAP_ENABLED: boolean;
  LDAP_URL: string;
  LDAP_SEARCH_BASE: string;
  // Polymorphic External ServiceDesk / SRM fields
  SRM_PROVIDER_TYPE: SrmProviderChoice;
  SRM_PROVIDER_URL: string;
  SRM_PROJECT_KEY: string;
  SRM_API_KEY: string;
  SRM_CUSTOM_FIELD_ID: string;
  // Legacy aliases for backward compatibility
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

    const providerUrl = map['SRM_PROVIDER_URL'] || map['JIRA_BASE_URL'] || process.env.JIRA_BASE_URL || process.env.JIRA_HOST || '';
    const projectKey = map['SRM_PROJECT_KEY'] || map['JIRA_PROJECT_KEY'] || process.env.JIRA_PROJECT_KEY || 'EMS';
    const customFieldId = map['SRM_CUSTOM_FIELD_ID'] || map['JIRA_EQUIPMENT_CUSTOM_FIELD'] || process.env.JIRA_EQUIPMENT_CUSTOM_FIELD || 'customfield_10100';
    const providerType = (map['SRM_PROVIDER_TYPE'] as SrmProviderChoice) || (providerUrl ? 'JIRA' : 'JIRA');

    const config: SystemSettingsConfig = {
      APP_NAME: map['APP_NAME'] || process.env.NEXT_PUBLIC_APP_NAME || 'EMS — Equipment Management System',
      LDAP_ENABLED: map['LDAP_ENABLED'] === 'true' || process.env.LDAP_ENABLED === 'true',
      LDAP_URL: map['LDAP_URL'] || process.env.LDAP_URL || '',
      LDAP_SEARCH_BASE: map['LDAP_SEARCH_BASE'] || process.env.LDAP_SEARCH_BASE || 'dc=company,dc=local',
      SRM_PROVIDER_TYPE: providerType,
      SRM_PROVIDER_URL: providerUrl,
      SRM_PROJECT_KEY: projectKey,
      SRM_API_KEY: map['SRM_API_KEY'] || '',
      SRM_CUSTOM_FIELD_ID: customFieldId,
      JIRA_BASE_URL: providerUrl,
      JIRA_PROJECT_KEY: projectKey,
      JIRA_EQUIPMENT_CUSTOM_FIELD: customFieldId,
    };

    cachedSettings = {
      data: config,
      expiresAt: now + CACHE_TTL_MS,
    };

    return config;
  } catch (error) {
    console.error('Ошибка чтения SystemSetting из БД, используются fallback-значения:', error);
    const fallbackUrl = process.env.JIRA_BASE_URL || process.env.JIRA_HOST || '';
    return {
      APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'EMS — Equipment Management System',
      LDAP_ENABLED: process.env.LDAP_ENABLED === 'true',
      LDAP_URL: process.env.LDAP_URL || '',
      LDAP_SEARCH_BASE: process.env.LDAP_SEARCH_BASE || 'dc=company,dc=local',
      SRM_PROVIDER_TYPE: fallbackUrl ? 'JIRA' : 'JIRA',
      SRM_PROVIDER_URL: fallbackUrl,
      SRM_PROJECT_KEY: process.env.JIRA_PROJECT_KEY || 'EMS',
      SRM_API_KEY: '',
      SRM_CUSTOM_FIELD_ID: process.env.JIRA_EQUIPMENT_CUSTOM_FIELD || 'customfield_10100',
      JIRA_BASE_URL: fallbackUrl,
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
