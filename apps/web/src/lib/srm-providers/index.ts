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
