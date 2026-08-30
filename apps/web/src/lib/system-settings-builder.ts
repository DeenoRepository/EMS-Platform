import type { SrmProviderChoice, SystemSettingsConfig } from './system-settings-service';

export type SystemSettingsEnv = Readonly<Record<string, string | undefined>>;

export interface SystemSettingRecord {
  key: string;
  value: string;
}

const DEFAULT_APP_NAME = 'EMS — Equipment Management System';
const DEFAULT_SEARCH_BASE = 'dc=company,dc=local';
const DEFAULT_PROJECT_KEY = 'EMS';
const DEFAULT_CUSTOM_FIELD_ID = 'customfield_10100';

function createSettingsMap(records: readonly SystemSettingRecord[]): Record<string, string> {
  return Object.fromEntries(records.map((record) => [record.key, record.value]));
}

function resolveSharedSettings(map: Record<string, string>, env: SystemSettingsEnv) {
  const providerUrl = map.SRM_PROVIDER_URL || map.JIRA_BASE_URL || env.JIRA_BASE_URL || env.JIRA_HOST || '';
  const projectKey = map.SRM_PROJECT_KEY || map.JIRA_PROJECT_KEY || env.JIRA_PROJECT_KEY || DEFAULT_PROJECT_KEY;
  const customFieldId =
    map.SRM_CUSTOM_FIELD_ID ||
    map.JIRA_EQUIPMENT_CUSTOM_FIELD ||
    env.JIRA_EQUIPMENT_CUSTOM_FIELD ||
    DEFAULT_CUSTOM_FIELD_ID;
  const providerType = (map.SRM_PROVIDER_TYPE as SrmProviderChoice) || 'JIRA';

  return { providerUrl, projectKey, customFieldId, providerType };
}

export function buildSystemSettings(
  records: readonly SystemSettingRecord[],
  env: SystemSettingsEnv,
): SystemSettingsConfig {
  const map = createSettingsMap(records);
  const { providerUrl, projectKey, customFieldId, providerType } = resolveSharedSettings(map, env);

  return {
    APP_NAME: map.APP_NAME || env.NEXT_PUBLIC_APP_NAME || DEFAULT_APP_NAME,
    LDAP_ENABLED: map.LDAP_ENABLED === 'true' || env.LDAP_ENABLED === 'true',
    LDAP_URL: map.LDAP_URL || env.LDAP_URL || '',
    LDAP_SEARCH_BASE: map.LDAP_SEARCH_BASE || env.LDAP_SEARCH_BASE || DEFAULT_SEARCH_BASE,
    SRM_PROVIDER_TYPE: providerType,
    SRM_PROVIDER_URL: providerUrl,
    SRM_PROJECT_KEY: projectKey,
    SRM_API_KEY: map.SRM_API_KEY || '',
    SRM_CUSTOM_FIELD_ID: customFieldId,
    JIRA_BASE_URL: providerUrl,
    JIRA_PROJECT_KEY: projectKey,
    JIRA_EQUIPMENT_CUSTOM_FIELD: customFieldId,
  };
}

export function buildSystemSettingsFromEnv(env: SystemSettingsEnv): SystemSettingsConfig {
  return buildSystemSettings([], env);
}
