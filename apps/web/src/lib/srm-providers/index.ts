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
export function sanitizeAuthConfig(authConfig: any): any {
  if (!authConfig || typeof authConfig !== 'object') return {};
  const sanitized = { ...authConfig };
  if (sanitized.password) sanitized.password = '••••••••';
  if (sanitized.apiToken) sanitized.apiToken = '••••••••';
  if (sanitized.apiKey) sanitized.apiKey = '••••••••';
  if (sanitized.token) sanitized.token = '••••••••';
  return sanitized;
}

/**
 * Слияние обновленной конфигурации с сохранением существующих секретов, если передан плейсхолдер
 */
export function mergeAuthConfig(newAuthConfig: any, existingAuthConfig: any): any {
  if (!newAuthConfig) return existingAuthConfig || {};
  if (!existingAuthConfig) return newAuthConfig;
  const merged = { ...newAuthConfig };
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
export function extractIssueFromWebhookPayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return null;

  // 1. Atlassian Jira Webhook: { webhookEvent: 'jira:issue_created', issue: { ... } }
  if (payload.issue && typeof payload.issue === 'object') {
    return payload.issue;
  }

  // 2. GitLab Issues Webhook: { object_kind: 'issue', object_attributes: { ... } }
  if (payload.object_kind === 'issue' && payload.object_attributes) {
    return {
      ...payload.object_attributes,
      references: payload.project ? { full: `${payload.project.path_with_namespace}#${payload.object_attributes.iid}` } : { full: `#${payload.object_attributes.iid}` },
      author: payload.user || payload.object_attributes.author,
      assignee: payload.assignees?.[0] || payload.assignee,
    };
  }

  // 3. Redmine Webhook: { action: 'opened', issue: { ... } }
  if (payload.issue) {
    return payload.issue;
  }

  // 4. Generic REST payload: если передан сразу объект инцидента
  if (payload.id || payload.key || payload.issueKey || payload.summary || payload.title) {
    return payload;
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
