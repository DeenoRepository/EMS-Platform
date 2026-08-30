import { prisma } from '@ems/database';
import { logger } from './logger';
import { buildSystemSettings, buildSystemSettingsFromEnv } from './system-settings-builder';

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
    const config = buildSystemSettings(records, process.env);

    cachedSettings = {
      data: config,
      expiresAt: now + CACHE_TTL_MS,
    };

    return config;
  } catch (error) {
    logger.error('Ошибка чтения SystemSetting из БД, используются fallback-значения', {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return buildSystemSettingsFromEnv(process.env);
  }
}

/**
 * Инвалидация кеша системных настроек
 */
export function invalidateSystemSettingsCache(): void {
  cachedSettings = null;
}
