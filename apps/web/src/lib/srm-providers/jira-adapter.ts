import { SrmIntegration, SrmProviderType } from '@ems/database';
import { ISrmProviderAdapter, SrmProviderMetadata, SrmTestConnectionResult } from './types';

export class JiraProviderAdapter implements ISrmProviderAdapter {
  readonly providerType: SrmProviderType = 'JIRA';

  getMetadata(): SrmProviderMetadata {
    return {
      type: 'JIRA',
      name: 'Atlassian Jira (Cloud / Server / Data Center)',
      description: 'Интеграция с Jira через официальный REST API v2/v3 для задач и Service Management.',
      icon: 'jira',
      defaultEndpoint: '/rest/api/2/search',
      defaultAuthType: 'BASIC',
      defaultHeaders: {
        Accept: 'application/json',
      },
      defaultMapping: {
        standardMappings: [
          { srmField: 'issueKey', label: 'Ключ задачи', jiraPath: 'key', transformType: 'string', isRequired: true },
          { srmField: 'summary', label: 'Тема / Заголовок', jiraPath: 'fields.summary', transformType: 'string', isRequired: true },
          { srmField: 'status', label: 'Статус', jiraPath: 'fields.status.name', transformType: 'string', isRequired: true },
          { srmField: 'priority', label: 'Приоритет', jiraPath: 'fields.priority.name', transformType: 'string', isRequired: true },
          { srmField: 'issueType', label: 'Тип задачи', jiraPath: 'fields.issuetype.name', transformType: 'string', isRequired: true },
          { srmField: 'assignee', label: 'Исполнитель', jiraPath: 'fields.assignee.displayName', transformType: 'string', isRequired: false },
          { srmField: 'reporter', label: 'Автор заявки', jiraPath: 'fields.reporter.displayName', transformType: 'string', isRequired: false },
          { srmField: 'createdDate', label: 'Дата создания', jiraPath: 'fields.created', transformType: 'date', isRequired: true },
          { srmField: 'resolvedDate', label: 'Дата закрытия', jiraPath: 'fields.resolutiondate', transformType: 'date', isRequired: false },
        ],
        equipmentMatching: {
          sourcePath: 'fields.customfield_10100',
          matchBy: 'inventoryNumber',
          regexPattern: '(?:ИНВ|INV|EQ)[-_#]?([A-Za-z0-9-]+)',
        },
      },
    };
  }

  private buildHeaders(integration: SrmIntegration): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Atlassian-Token': 'no-check',
    };

    const auth = (integration.authConfig as any) || {};
    if (integration.authType === 'BASIC') {
      const username = auth.username || auth.email || '';
      const password = auth.apiToken || auth.password || auth.token || '';
      if (username && password) {
        headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      } else if (password) {
        if (password.startsWith('Basic ') || password.startsWith('Bearer ')) {
          headers['Authorization'] = password;
        } else if (password.includes(':')) {
          headers['Authorization'] = `Basic ${Buffer.from(password).toString('base64')}`;
        } else {
          try {
            const decoded = Buffer.from(password, 'base64').toString('utf-8');
            if (decoded.includes(':') && /^[\x20-\x7E]+$/.test(decoded)) {
              headers['Authorization'] = `Basic ${password}`;
            } else {
              headers['Authorization'] = `Bearer ${password}`;
            }
          } catch {
            headers['Authorization'] = `Bearer ${password}`;
          }
        }
      }
    } else if (integration.authType === 'BEARER' && (auth.token || auth.apiKey || auth.apiToken)) {
      const tok = auth.token || auth.apiKey || auth.apiToken;
      headers['Authorization'] = tok.startsWith('Bearer ') ? tok : `Bearer ${tok}`;
    } else if (integration.authType === 'API_KEY' && auth.apiKey) {
      const headerName = auth.headerName || 'X-Atlassian-Token';
      headers[headerName] = auth.apiKey;
    }

    return headers;
  }

  async testConnection(integration: SrmIntegration): Promise<SrmTestConnectionResult> {
    try {
      const query = (integration.queryConfig as any) || {};
      const endpoint = query.endpoint || '/rest/api/2/myself';
      const url = `${integration.baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(integration),
      });

      if (!res.ok) {
        return {
          success: false,
          statusCode: res.status,
          message: `Ошибка ответа Jira API: HTTP ${res.status} ${res.statusText}`,
          diagnostics: [
            `Запрос к ${url}`,
            `Проверьте URL сервера, логин и API-токен Jira`,
          ],
        };
      }

      const data = await res.json();
      return {
        success: true,
        statusCode: res.status,
        message: `Успешное подключение к Jira! Пользователь: ${data.displayName || data.name || 'OK'}`,
        sampleItem: data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Ошибка соединения с Jira: ${err.message || err}`,
        diagnostics: ['Проверьте сетевую доступность хоста Jira и корректность базового URL'],
      };
    }
  }

  async fetchIssues(integration: SrmIntegration): Promise<any[]> {
    const query = (integration.queryConfig as any) || {};
    const projectKey = query.projectKey || 'EMS';
    const jql = query.jql || `project = ${projectKey} ORDER BY created DESC`;
    const maxResults = query.maxResults || 50;

    const endpoint = query.endpoint || '/rest/api/2/search';
    const url = `${integration.baseUrl.replace(/\/$/, '')}${endpoint}?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders(integration),
    });

    if (!res.ok) {
      throw new Error(`Ошибка запроса к Jira: HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return data.issues || [];
  }
}
