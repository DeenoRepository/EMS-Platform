import { SrmProviderType } from '@ems/database';
import { ISrmProviderAdapter, SrmProviderMetadata } from './types';
import { JiraProviderAdapter } from './jira-adapter';
import { RedmineProviderAdapter } from './redmine-adapter';
import { GitLabProviderAdapter } from './gitlab-adapter';
import { GenericRestProviderAdapter } from './generic-rest-adapter';

export * from './types';
export * from './jira-adapter';
export * from './redmine-adapter';
export * from './gitlab-adapter';
export * from './generic-rest-adapter';

const adapters: Record<SrmProviderType, ISrmProviderAdapter> = {
  JIRA: new JiraProviderAdapter(),
  REDMINE: new RedmineProviderAdapter(),
  GITLAB_ISSUES: new GitLabProviderAdapter(),
  REST_GENERIC: new GenericRestProviderAdapter(),
  SERVICE_NOW: new GenericRestProviderAdapter(),
  CUSTOM_WEBHOOK: new GenericRestProviderAdapter(),
};

/**
 * Получение адаптера провайдера по типу
 */
export function getSrmAdapter(type: SrmProviderType): ISrmProviderAdapter {
  const adapter = adapters[type];
  if (!adapter) {
    return adapters.REST_GENERIC;
  }
  return adapter;
}

/**
 * Санитизация конфигурации аутентификации (маскирование паролей и токенов)
 */
export function sanitizeAuthConfig(authConfig: unknown): Record<string, unknown> {
  if (!authConfig || typeof authConfig !== 'object') return {};
  const sanitized: Record<string, unknown> = { ...(authConfig as Record<string, unknown>) };
  if (sanitized.password) sanitized.password = '••••••••';
  if (sanitized.apiToken) sanitized.apiToken = '••••••••';
  if (sanitized.apiKey) sanitized.apiKey = '••••••••';
  if (sanitized.token) sanitized.token = '••••••••';
  return sanitized;
}

/**
 * Слияние обновленной конфигурации с сохранением существующих секретов, если передан плейсхолдер
 */
export function mergeAuthConfig(
  newAuthConfig: Record<string, unknown> | null | undefined,
  existingAuthConfig: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!newAuthConfig) return existingAuthConfig || {};
  if (!existingAuthConfig) return newAuthConfig;
  const merged: Record<string, unknown> = { ...newAuthConfig };
  const secretKeys = ['password', 'apiToken', 'apiKey', 'token'];
  for (const key of secretKeys) {
    if (merged[key] === '••••••••' || merged[key] === undefined || merged[key] === '') {
      if (existingAuthConfig[key]) {
        merged[key] = existingAuthConfig[key];
      }
    }
  }
  return merged;
}

/**
 * Извлечение объекта задачи из разнородных форматов входящих вебхуков (Jira, GitLab, Redmine, Generic)
 */
export function extractIssueFromWebhookPayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, any>;

  // 1. Atlassian Jira Webhook: { webhookEvent: 'jira:issue_created', issue: { ... } }
  if (p.issue && typeof p.issue === 'object') {
    return p.issue;
  }

  // 2. GitLab Issues Webhook: { object_kind: 'issue', object_attributes: { ... } }
  if (p.object_kind === 'issue' && p.object_attributes) {
    return {
      ...p.object_attributes,
      references: p.project ? { full: `${p.project.path_with_namespace}#${p.object_attributes.iid}` } : { full: `#${p.object_attributes.iid}` },
      author: p.user || p.object_attributes.author,
      assignee: p.assignees?.[0] || p.assignee,
    };
  }

  // 3. Redmine Webhook: { action: 'opened', issue: { ... } }
  if (p.issue) {
    return p.issue;
  }

  // 4. Generic REST payload: если передан сразу объект инцидента
  if (p.id || p.key || p.issueKey || p.summary || p.title) {
    return p;
  }

  return null;
}

/**
 * Список всех поддерживаемых провайдеров интеграций
 */
export function getAvailableSrmProviders(): SrmProviderMetadata[] {
  return [
    adapters.JIRA.getMetadata(),
    adapters.REDMINE.getMetadata(),
    adapters.GITLAB_ISSUES.getMetadata(),
    adapters.REST_GENERIC.getMetadata(),
  ];
}
