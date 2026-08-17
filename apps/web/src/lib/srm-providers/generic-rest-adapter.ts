import { SrmIntegration, SrmProviderType } from '@ems/database';
import { ISrmProviderAdapter, SrmProviderMetadata, SrmTestConnectionResult } from './types';
import { extractValueByPath } from '../jira-service';

export class GenericRestProviderAdapter implements ISrmProviderAdapter {
  readonly providerType: SrmProviderType = 'REST_GENERIC';

  getMetadata(): SrmProviderMetadata {
    return {
      type: 'REST_GENERIC',
      name: 'Универсальный REST / JSON API (1С:ТОиР, ServiceDesk, ServiceNow)',
      description: 'Подключение к любой сторонней системе через стандартный HTTP REST/JSON эндпоинт с произвольной схемой.',
      icon: 'api',
      defaultEndpoint: '/api/v1/incidents',
      defaultAuthType: 'BEARER',
      defaultHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      defaultMapping: {
        standardMappings: [
          { srmField: 'issueKey', label: 'ID заявки', jiraPath: 'id', transformType: 'string', isRequired: true },
          { srmField: 'summary', label: 'Тема заявки', jiraPath: 'title', transformType: 'string', isRequired: true },
          { srmField: 'status', label: 'Статус', jiraPath: 'status', transformType: 'string', isRequired: true },
          { srmField: 'priority', label: 'Приоритет', jiraPath: 'priority', transformType: 'string', isRequired: true },
          { srmField: 'issueType', label: 'Тип заявки', jiraPath: 'type', transformType: 'string', isRequired: true },
          { srmField: 'assignee', label: 'Ответственный', jiraPath: 'assignee', transformType: 'string', isRequired: false },
          { srmField: 'reporter', label: 'Инициатор', jiraPath: 'creator', transformType: 'string', isRequired: false },
          { srmField: 'createdDate', label: 'Дата регистрации', jiraPath: 'createdAt', transformType: 'date', isRequired: true },
          { srmField: 'resolvedDate', label: 'Дата завершения', jiraPath: 'resolvedAt', transformType: 'date', isRequired: false },
        ],
        equipmentMatching: {
          sourcePath: 'equipmentCode',
          matchBy: 'inventoryNumber',
        },
      },
    };
  }

  private buildHeaders(integration: SrmIntegration): Record<string, string> {
    const query = (integration.queryConfig as any) || {};
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(query.headers || {}),
    };

    const auth = (integration.authConfig as any) || {};
    if (integration.authType === 'BEARER' && auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (integration.authType === 'BASIC') {
      const username = auth.username || '';
      const password = auth.password || '';
      if (username && password) {
        headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      }
    } else if (integration.authType === 'API_KEY' && auth.apiKey) {
      const headerName = auth.headerName || 'X-API-Key';
      headers[headerName] = auth.apiKey;
    } else if (integration.authType === 'CUSTOM_HEADERS' && auth.customHeaders) {
      Object.assign(headers, auth.customHeaders);
    }

    return headers;
  }

  async testConnection(integration: SrmIntegration): Promise<SrmTestConnectionResult> {
    try {
      const query = (integration.queryConfig as any) || {};
      const endpoint = query.testEndpoint || query.endpoint || '';
      const method = query.testMethod || 'GET';
      const url = `${integration.baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

      const res = await fetch(url, {
        method,
        headers: this.buildHeaders(integration),
      });

      if (!res.ok) {
        return {
          success: false,
          statusCode: res.status,
          message: `Ошибка ответа REST API: HTTP ${res.status} ${res.statusText}`,
          diagnostics: [`Проверьте эндпоинт ${url} и параметры авторизации`],
        };
      }

      const data = await res.json();
      return {
        success: true,
        statusCode: res.status,
        message: `Успешный ответ от внешнего REST API (HTTP ${res.status})`,
        sampleItem: Array.isArray(data) ? data[0] : data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Ошибка запроса к REST API: ${err.message || err}`,
        diagnostics: ['Проверьте сетевой адрес и параметры запроса'],
      };
    }
  }

  async fetchIssues(integration: SrmIntegration): Promise<any[]> {
    const query = (integration.queryConfig as any) || {};
    const endpoint = query.endpoint || '';
    const method = query.method || 'GET';
    const itemsPath = query.itemsPath || ''; // например "data.items" или "incidents" или ""
    const url = `${integration.baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const options: RequestInit = {
      method,
      headers: this.buildHeaders(integration),
    };

    if (method === 'POST' && query.body) {
      options.body = typeof query.body === 'string' ? query.body : JSON.stringify(query.body);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`Ошибка запроса к REST API: HTTP ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    if (itemsPath) {
      const extracted = extractValueByPath(json, itemsPath);
      return Array.isArray(extracted) ? extracted : [];
    }

    if (Array.isArray(json)) return json;
    if (json.data && Array.isArray(json.data)) return json.data;
    if (json.items && Array.isArray(json.items)) return json.items;
    if (json.issues && Array.isArray(json.issues)) return json.issues;

    return [json];
  }
}
