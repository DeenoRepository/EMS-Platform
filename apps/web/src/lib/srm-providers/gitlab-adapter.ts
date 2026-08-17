import { SrmIntegration, SrmProviderType } from '@ems/database';
import { ISrmProviderAdapter, SrmProviderMetadata, SrmTestConnectionResult } from './types';

export class GitLabProviderAdapter implements ISrmProviderAdapter {
  readonly providerType: SrmProviderType = 'GITLAB_ISSUES';

  getMetadata(): SrmProviderMetadata {
    return {
      type: 'GITLAB_ISSUES',
      name: 'GitLab Issues (CE / EE / GitLab.com)',
      description: 'Импорт заявок и инцидентов из встроенного трекера задач GitLab Project.',
      icon: 'gitlab',
      defaultEndpoint: '/api/v4/projects/:id/issues',
      defaultAuthType: 'BEARER',
      defaultHeaders: {
        Accept: 'application/json',
      },
      defaultMapping: {
        standardMappings: [
          { srmField: 'issueKey', label: 'IID задачи', jiraPath: 'references.full', transformType: 'string', isRequired: true },
          { srmField: 'summary', label: 'Заголовок', jiraPath: 'title', transformType: 'string', isRequired: true },
          { srmField: 'status', label: 'Состояние', jiraPath: 'state', transformType: 'string', isRequired: true },
          { srmField: 'priority', label: 'Приоритет', jiraPath: 'labels[0]', transformType: 'string', isRequired: true },
          { srmField: 'issueType', label: 'Тип', jiraPath: 'issue_type', transformType: 'string', isRequired: true },
          { srmField: 'assignee', label: 'Исполнитель', jiraPath: 'assignee.name', transformType: 'string', isRequired: false },
          { srmField: 'reporter', label: 'Автор', jiraPath: 'author.name', transformType: 'string', isRequired: false },
          { srmField: 'createdDate', label: 'Создана', jiraPath: 'created_at', transformType: 'date', isRequired: true },
          { srmField: 'resolvedDate', label: 'Закрыта', jiraPath: 'closed_at', transformType: 'date', isRequired: false },
        ],
        equipmentMatching: {
          sourcePath: 'description',
          matchBy: 'regex',
          regexPattern: '(?:ИНВ|INV|EQ)[-_#]?([A-Za-z0-9-]+)',
        },
      },
    };
  }

  private buildHeaders(integration: SrmIntegration): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    const auth = (integration.authConfig as any) || {};
    if (integration.authType === 'BEARER' && auth.token) {
      headers['PRIVATE-TOKEN'] = auth.token;
    } else if (integration.authType === 'API_KEY' && auth.apiKey) {
      headers['PRIVATE-TOKEN'] = auth.apiKey;
    }

    return headers;
  }

  async testConnection(integration: SrmIntegration): Promise<SrmTestConnectionResult> {
    try {
      const url = `${integration.baseUrl.replace(/\/$/, '')}/api/v4/user`;
      const res = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(integration),
      });

      if (!res.ok) {
        return {
          success: false,
          statusCode: res.status,
          message: `Ошибка ответа GitLab API: HTTP ${res.status} ${res.statusText}`,
          diagnostics: [`Проверьте токен Personal Access Token с правами read_api`],
        };
      }

      const data = await res.json();
      return {
        success: true,
        statusCode: res.status,
        message: `Успешное подключение к GitLab! Пользователь: ${data.name} (@${data.username})`,
        sampleItem: data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Ошибка соединения с GitLab: ${err.message || err}`,
        diagnostics: ['Проверьте сетевой адрес инстанса GitLab'],
      };
    }
  }

  async fetchIssues(integration: SrmIntegration): Promise<any[]> {
    const query = (integration.queryConfig as any) || {};
    const projectId = query.projectId;
    if (!projectId) {
      throw new Error('Для GitLab интеграции необходимо указать Project ID в queryConfig');
    }

    const perPage = query.perPage || 50;
    const url = `${integration.baseUrl.replace(/\/$/, '')}/api/v4/projects/${encodeURIComponent(projectId)}/issues?per_page=${perPage}&order_by=created_at&sort=desc`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders(integration),
    });

    if (!res.ok) {
      throw new Error(`Ошибка запроса к GitLab Issues: HTTP ${res.status} ${res.statusText}`);
    }

    return await res.json();
  }
}
