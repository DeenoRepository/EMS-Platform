import { SrmIntegration, SrmProviderType } from '@ems/database';
import { ISrmProviderAdapter, SrmProviderMetadata, SrmTestConnectionResult } from './types';

type RedmineCurrentUserResponse = Record<string, unknown> & {
  user?: {
    firstname?: unknown;
    lastname?: unknown;
    login?: unknown;
  };
};

function isRedmineCurrentUserResponse(value: unknown): value is RedmineCurrentUserResponse {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class RedmineProviderAdapter implements ISrmProviderAdapter {
  readonly providerType: SrmProviderType = 'REDMINE';

  getMetadata(): SrmProviderMetadata {
    return {
      type: 'REDMINE',
      name: 'Redmine Issue Tracker / ServiceDesk',
      description: 'Интеграция с Redmine REST API для импорта задач и заявок технической поддержки.',
      icon: 'redmine',
      defaultEndpoint: '/issues.json',
      defaultAuthType: 'API_KEY',
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
      defaultMapping: {
        standardMappings: [
          { srmField: 'issueKey', label: 'Номер задачи', jiraPath: 'id', transformType: 'string', isRequired: true },
          { srmField: 'summary', label: 'Тема', jiraPath: 'subject', transformType: 'string', isRequired: true },
          { srmField: 'status', label: 'Статус', jiraPath: 'status.name', transformType: 'string', isRequired: true },
          { srmField: 'priority', label: 'Приоритет', jiraPath: 'priority.name', transformType: 'string', isRequired: true },
          { srmField: 'issueType', label: 'Трекер', jiraPath: 'tracker.name', transformType: 'string', isRequired: true },
          { srmField: 'assignee', label: 'Назначена', jiraPath: 'assigned_to.name', transformType: 'string', isRequired: false },
          { srmField: 'reporter', label: 'Автор', jiraPath: 'author.name', transformType: 'string', isRequired: false },
          { srmField: 'createdDate', label: 'Создана', jiraPath: 'created_on', transformType: 'date', isRequired: true },
          { srmField: 'resolvedDate', label: 'Закрыта', jiraPath: 'closed_on', transformType: 'date', isRequired: false },
        ],
        equipmentMatching: {
          sourcePath: 'custom_fields[0].value',
          matchBy: 'inventoryNumber',
          regexPattern: '(?:ИНВ|INV|EQ)[-_#]?([A-Za-z0-9-]+)',
        },
      },
    };
  }

  private buildHeaders(integration: SrmIntegration): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const auth = (integration.authConfig as any) || {};
    if (integration.authType === 'API_KEY' && auth.apiKey) {
      headers['X-Redmine-API-Key'] = auth.apiKey;
    } else if (integration.authType === 'BASIC') {
      const username = auth.username || '';
      const password = auth.password || '';
      if (username && password) {
        headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      }
    } else if (integration.authType === 'BEARER' && auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    return headers;
  }

  async testConnection(integration: SrmIntegration): Promise<SrmTestConnectionResult> {
    try {
      const url = `${integration.baseUrl.replace(/\/$/, '')}/users/current.json`;
      const res = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(integration),
      });

      if (!res.ok) {
        return {
          success: false,
          statusCode: res.status,
          message: `Ошибка ответа Redmine API: HTTP ${res.status} ${res.statusText}`,
          diagnostics: [
            `Запрос к ${url}`,
            `Убедитесь, что включен REST API в настройках Redmine (Администрирование -> Настройки -> API)`,
          ],
        };
      }

      const rawData: unknown = await res.json();
      const data = isRedmineCurrentUserResponse(rawData) ? rawData : {};
      return {
        success: true,
        statusCode: res.status,
        message: `Успешное подключение к Redmine! Пользователь: ${data.user?.firstname} ${data.user?.lastname} (${data.user?.login})`,
        sampleItem: data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Ошибка соединения с Redmine: ${err.message || err}`,
        diagnostics: ['Проверьте сетевую доступность сервера Redmine и корректность API-ключа'],
      };
    }
  }

  async fetchIssues(integration: SrmIntegration): Promise<any[]> {
    const query = (integration.queryConfig as any) || {};
    const projectId = query.projectId ? `project_id=${query.projectId}&` : '';
    const limit = query.limit || 50;

    const url = `${integration.baseUrl.replace(/\/$/, '')}/issues.json?${projectId}limit=${limit}&sort=created_on:desc`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders(integration),
    });

    if (!res.ok) {
      throw new Error(`Ошибка запроса к Redmine: HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.issues || [];
  }
}
