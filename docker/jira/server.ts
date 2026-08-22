import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description: string;
    issuetype: {
      id: string;
      name: string;
      subtask: boolean;
      iconUrl?: string;
    };
    project: {
      id: string;
      key: string;
      name: string;
    };
    status: {
      id: string;
      name: string;
      statusCategory: {
        id: number;
        key: string;
        name: string;
        colorName?: string;
      };
    };
    priority: {
      id: string;
      name: string;
      iconUrl?: string;
    };
    resolution?: {
      id: string;
      name: string;
    } | null;
    assignee?: {
      name: string;
      displayName: string;
      emailAddress?: string;
    } | null;
    reporter?: {
      name: string;
      displayName: string;
      emailAddress?: string;
    } | null;
    created: string;
    updated: string;
    resolutiondate?: string | null;
    customfield_10100?: string; // Оборудование
    customfield_10103?: string; // Время до решения (SLA)
    customfield_10104?: string; // Время до первого отклика (SLA)
    customfield_work_type?: string; // Тип проводимых работ
    customfield_author?: string; // ФИО Автора
    customfield_request_type?: string; // Тип запроса клиента
    [key: string]: any;
  };
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  lead?: {
    name: string;
    displayName: string;
  };
}

const PROJECTS_MAP: Record<string, JiraProject> = {
  GRIO: {
    id: '10403',
    key: 'GRIO',
    name: 'ГРиО КПИМС (Сектор сборки)',
    projectTypeKey: 'service_desk',
    lead: { name: 'antonov.alexei', displayName: 'Антонов Алексей Игоревич' },
  },
  GRIO1: {
    id: '10404',
    key: 'GRIO1',
    name: 'ГРиО НПКПП (Сектор сборки)',
    projectTypeKey: 'service_desk',
    lead: { name: 'antonov.alexei', displayName: 'Антонов Алексей Игоревич' },
  },
  GRIO2: {
    id: '10405',
    key: 'GRIO2',
    name: 'ГриО КПИМС (Сектор измерений)',
    projectTypeKey: 'service_desk',
    lead: { name: 'kvashnin.ilya', displayName: 'Квашнин Илья Николаевич' },
  },
};

const FIELDS_METADATA = [
  { id: 'summary', name: 'Тема / Заголовок', custom: false, schema: { type: 'string', system: 'summary' } },
  { id: 'description', name: 'Описание', custom: false, schema: { type: 'string', system: 'description' } },
  { id: 'issuetype', name: 'Тип задачи', custom: false, schema: { type: 'issuetype', system: 'issuetype' } },
  { id: 'status', name: 'Статус', custom: false, schema: { type: 'status', system: 'status' } },
  { id: 'priority', name: 'Приоритет', custom: false, schema: { type: 'priority', system: 'priority' } },
  { id: 'assignee', name: 'Исполнитель', custom: false, schema: { type: 'user', system: 'assignee' } },
  { id: 'reporter', name: 'Автор', custom: false, schema: { type: 'user', system: 'reporter' } },
  { id: 'created', name: 'Дата создания', custom: false, schema: { type: 'datetime', system: 'created' } },
  { id: 'updated', name: 'Дата обновления', custom: false, schema: { type: 'datetime', system: 'updated' } },
  { id: 'resolutiondate', name: 'Дата решения', custom: false, schema: { type: 'datetime', system: 'resolutiondate' } },
  { id: 'customfield_10100', name: 'Оборудование', custom: true, schema: { type: 'string', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield', customId: 10100 } },
  { id: 'customfield_10103', name: 'Время до решения', custom: true, schema: { type: 'string', custom: 'com.atlassian.servicedesk:sd-sla-field', customId: 10103 } },
  { id: 'customfield_10104', name: 'Время до первого отклика', custom: true, schema: { type: 'string', custom: 'com.atlassian.servicedesk:sd-sla-field', customId: 10104 } },
  { id: 'customfield_work_type', name: 'Тип проводимых работ', custom: true, schema: { type: 'string', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:select', customId: 10105 } },
  { id: 'customfield_author', name: 'ФИО Автора', custom: true, schema: { type: 'string', custom: 'com.atlassian.jira.plugin.system.customfieldtypes:textfield', customId: 10106 } },
];

function decodeXmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function parseIsoDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {
    // fallback
  }
  return new Date().toISOString();
}

/**
 * Парсер Jira XML RSS экспорта
 */
export function parseJiraXmlFile(filePath: string, baseUrl: string = 'http://localhost:8080'): JiraIssue[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const xmlContent = fs.readFileSync(filePath, 'utf-8');
  const items: JiraIssue[] = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(xmlContent)) !== null) {
    const itemBlock = itemMatch[1];

    const getTagValue = (tagName: string): string => {
      const regex = new RegExp(`<${tagName}(?:[^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'i');
      const match = regex.exec(itemBlock);
      return match ? decodeXmlEntities(match[1].trim()) : '';
    };

    const getTagAttr = (tagName: string, attrName: string): string => {
      const regex = new RegExp(`<${tagName}[^>]*\\s+${attrName}=["']([^"']*)["']`, 'i');
      const match = regex.exec(itemBlock);
      return match ? decodeXmlEntities(match[1].trim()) : '';
    };

    const key = getTagValue('key') || getTagValue('title');
    const id = getTagAttr('key', 'id') || String(Date.now());
    const summary = getTagValue('summary') || 'Без темы';
    const description = getTagValue('description')
      .replace(/<p>/gi, '')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    const projKey = getTagAttr('project', 'key') || (key.includes('-') ? key.split('-')[0] : 'GRIO');
    const projId = getTagAttr('project', 'id') || '10403';
    const projName = getTagValue('project') || PROJECTS_MAP[projKey]?.name || 'SRM Project';

    const typeId = getTagAttr('type', 'id') || '10001';
    const typeName = getTagValue('type') || 'Сервисный запрос';

    const priorityId = getTagAttr('priority', 'id') || '10101';
    const priorityName = getTagValue('priority') || 'Medium';

    const statusId = getTagAttr('status', 'id') || '10004';
    const statusName = getTagValue('status') || 'Решен';

    const resolutionId = getTagAttr('resolution', 'id') || '10000';
    const resolutionName = getTagValue('resolution') || (statusName === 'Решен' ? 'Готово' : null);

    const assigneeUsername = getTagAttr('assignee', 'username') || '';
    const assigneeName = getTagValue('assignee') || '';

    const reporterUsername = getTagAttr('reporter', 'username') || '';
    const reporterName = getTagValue('reporter') || '';

    const created = parseIsoDate(getTagValue('created'));
    const updated = parseIsoDate(getTagValue('updated') || getTagValue('created'));
    const resolved = getTagValue('resolved') ? parseIsoDate(getTagValue('resolved')) : null;

    // Custom fields parsing
    let equipment = '';
    let slaResponse = '';
    let slaResolution = '';
    let workType = '';
    let authorFio = '';
    let requestType = '';

    const cfRegex = /<customfield\s+id=["']([^"']*)["'][^>]*>([\s\S]*?)<\/customfield>/g;
    let cfMatch: RegExpExecArray | null;

    while ((cfMatch = cfRegex.exec(itemBlock)) !== null) {
      const cfBlock = cfMatch[2];
      const cfNameMatch = /<customfieldname>([\s\S]*?)<\/customfieldname>/i.exec(cfBlock);
      const cfName = cfNameMatch ? decodeXmlEntities(cfNameMatch[1].trim()) : '';

      const cleanVal = (val: string) => {
        return decodeXmlEntities(val)
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
          .replace(/<[^>]+>/g, '')
          .replace(/[\r\n\s]+/g, ' ')
          .trim();
      };

      const cfValMatch = /<customfieldvalue[^>]*>([\s\S]*?)<\/customfieldvalue>/i.exec(cfBlock);
      const cfVal = cfValMatch ? cleanVal(cfValMatch[1]) : '';

      if (cfName.includes('Оборудование')) {
        equipment = cfVal;
      } else if (cfName.includes('отклика')) {
        slaResponse = cfVal;
      } else if (cfName.includes('решения')) {
        slaResolution = cfVal;
      } else if (cfName.includes('работ')) {
        workType = cfVal;
      } else if (cfName.includes('Автора')) {
        authorFio = cfVal;
      } else if (cfName.includes('Тип запроса')) {
        requestType = cfVal;
      }
    }

    const isDone = statusName.toLowerCase().includes('решен') || statusName.toLowerCase().includes('готов') || statusName.toLowerCase().includes('закрыт');

    const issue: JiraIssue = {
      id,
      key,
      self: `${baseUrl}/rest/api/2/issue/${key}`,
      fields: {
        summary,
        description,
        issuetype: {
          id: typeId,
          name: typeName,
          subtask: false,
        },
        project: {
          id: projId,
          key: projKey,
          name: projName,
        },
        status: {
          id: statusId,
          name: statusName,
          statusCategory: {
            id: isDone ? 3 : 2,
            key: isDone ? 'done' : 'indeterminate',
            name: isDone ? 'Done' : 'In Progress',
            colorName: isDone ? 'green' : 'yellow',
          },
        },
        priority: {
          id: priorityId,
          name: priorityName,
        },
        resolution: resolutionName ? { id: resolutionId, name: resolutionName } : null,
        assignee: assigneeName ? { name: assigneeUsername, displayName: assigneeName } : null,
        reporter: reporterName ? { name: reporterUsername, displayName: reporterName } : null,
        created,
        updated,
        resolutiondate: resolved,
        customfield_10100: equipment,
        customfield_10103: slaResolution,
        customfield_10104: slaResponse,
        customfield_work_type: workType,
        customfield_author: authorFio,
        customfield_request_type: requestType,
      },
    };

    items.push(issue);
  }

  return items;
}

export class JiraMockServer {
  private issues: JiraIssue[] = [];
  private server: http.Server | null = null;
  private port: number;
  private baseUrl: string;

  constructor(port: number = 8080, baseUrl?: string) {
    this.port = port;
    this.baseUrl = baseUrl || `http://localhost:${port}`;
  }

  public loadFromDirectory(tempDir: string): number {
    this.issues = [];
    if (!fs.existsSync(tempDir)) {
      console.warn(`[Jira Server] Directory "${tempDir}" does not exist.`);
      return 0;
    }

    const files = fs.readdirSync(tempDir).filter((f) => f.endsWith('.xml'));
    console.log(`[Jira Server] Found ${files.length} XML files in "${tempDir}". Loading...`);

    for (const file of files) {
      const fullPath = path.join(tempDir, file);
      const parsed = parseJiraXmlFile(fullPath, this.baseUrl);
      this.issues.push(...parsed);
      console.log(`  -> Loaded ${parsed.length} issues from "${file}"`);
    }

    // Sort by created date descending
    this.issues.sort((a, b) => new Date(b.fields.created).getTime() - new Date(a.fields.created).getTime());
    console.log(`[Jira Server] Total issues in memory: ${this.issues.length}`);
    return this.issues.length;
  }

  public getIssues(): JiraIssue[] {
    return this.issues;
  }

  private matchJql(issue: JiraIssue, jql: string): boolean {
    if (!jql || jql.trim() === '') return true;

    const jqlLower = jql.toLowerCase();

    // Check project match: project = GRIO or project in (GRIO, GRIO1)
    const projMatch = /project\s*=\s*['"]?([a-z0-9_-]+)['"]?/i.exec(jql);
    if (projMatch) {
      const targetProj = projMatch[1].toUpperCase();
      if (issue.fields.project.key.toUpperCase() !== targetProj) {
        return false;
      }
    }

    const projInMatch = /project\s+in\s*\(([^)]+)\)/i.exec(jql);
    if (projInMatch) {
      const allowedProjects = projInMatch[1].split(',').map((p) => p.trim().replace(/['"]/g, '').toUpperCase());
      if (!allowedProjects.includes(issue.fields.project.key.toUpperCase())) {
        return false;
      }
    }

    // Check status match
    const statusMatch = /status\s*=\s*['"]?([^'"]+)['"]?/i.exec(jql);
    if (statusMatch) {
      const targetStatus = statusMatch[1].toLowerCase();
      if (!issue.fields.status.name.toLowerCase().includes(targetStatus)) {
        return false;
      }
    }

    // Check text search
    if (jqlLower.includes('text ~') || jqlLower.includes('summary ~')) {
      const textMatch = /(?:text|summary)\s*~\s*['"]([^'"]+)['"]/i.exec(jql);
      if (textMatch) {
        const query = textMatch[1].toLowerCase();
        const fullText = `${issue.fields.summary} ${issue.fields.description} ${issue.key} ${issue.fields.customfield_10100 || ''}`.toLowerCase();
        if (!fullText.includes(query)) {
          return false;
        }
      }
    }

    return true;
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Atlassian-Token');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const parsedUrl = url.parse(req.url || '/', true);
        const pathname = parsedUrl.pathname || '/';

        const sendJson = (statusCode: number, data: any) => {
          res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(data, null, 2));
        };

        // 1. Healthcheck
        if (pathname === '/health' || pathname === '/status') {
          return sendJson(200, {
            status: 'ok',
            version: '9.10.0',
            issuesCount: this.issues.length,
            projects: Object.keys(PROJECTS_MAP),
          });
        }

        // 2. Myself info (auth test)
        if (pathname === '/rest/api/2/myself' || pathname === '/rest/api/3/myself') {
          return sendJson(200, {
            self: `${this.baseUrl}/rest/api/2/user?username=admin`,
            name: 'admin',
            key: 'admin',
            emailAddress: 'admin@company.local',
            displayName: 'Администратор Jira SRM',
            active: true,
            timeZone: 'Asia/Krasnoyarsk',
            groups: { size: 2, items: [{ name: 'jira-administrators' }, { name: 'jira-servicemanagement-users' }] },
          });
        }

        // 3. Server info
        if (pathname === '/rest/api/2/serverInfo' || pathname === '/rest/api/3/serverInfo') {
          return sendJson(200, {
            baseUrl: this.baseUrl,
            version: '9.10.0',
            versionNumbers: [9, 10, 0],
            deploymentType: 'Server',
            buildNumber: 9100000,
            buildDate: '2023-11-07T00:00:00.000+0700',
            serverTime: new Date().toISOString(),
            scmInfo: '21b576b9bbafda38a77d342b47a192de4ca470bc',
            serverTitle: 'Jira Service Management (NZPP Vostok Mock)',
          });
        }

        // 4. Projects list
        if (pathname === '/rest/api/2/project' || pathname === '/rest/api/3/project') {
          const list = Object.values(PROJECTS_MAP).map((p) => ({
            ...p,
            self: `${this.baseUrl}/rest/api/2/project/${p.id}`,
            avatarUrls: { '48x48': `${this.baseUrl}/secure/projectavatar?pid=${p.id}&size=large` },
          }));
          return sendJson(200, list);
        }

        // 5. Fields metadata
        if (pathname === '/rest/api/2/field' || pathname === '/rest/api/3/field') {
          return sendJson(200, FIELDS_METADATA);
        }

        // 6. Search Issues (/rest/api/2/search)
        if (pathname === '/rest/api/2/search' || pathname === '/rest/api/3/search') {
          let jql = (parsedUrl.query.jql as string) || '';
          let startAt = parseInt((parsedUrl.query.startAt as string) || '0', 10);
          let maxResults = parseInt((parsedUrl.query.maxResults as string) || '50', 10);

          if (req.method === 'POST') {
            let bodyStr = '';
            req.on('data', (chunk) => (bodyStr += chunk));
            req.on('end', () => {
              try {
                if (bodyStr) {
                  const body = JSON.parse(bodyStr);
                  if (body.jql) jql = body.jql;
                  if (body.startAt !== undefined) startAt = body.startAt;
                  if (body.maxResults !== undefined) maxResults = body.maxResults;
                }
              } catch {
                // ignore
              }
              const filtered = this.issues.filter((iss) => this.matchJql(iss, jql));
              const paged = filtered.slice(startAt, startAt + maxResults);
              sendJson(200, {
                startAt,
                maxResults,
                total: filtered.length,
                issues: paged,
              });
            });
            return;
          }

          const filtered = this.issues.filter((iss) => this.matchJql(iss, jql));
          const paged = filtered.slice(startAt, startAt + maxResults);
          return sendJson(200, {
            startAt,
            maxResults,
            total: filtered.length,
            issues: paged,
          });
        }

        // 7. Single Issue (/rest/api/2/issue/:key)
        const issueMatch = /^\/rest\/api\/(?:2|3)\/issue\/([A-Za-z0-9_-]+)/.exec(pathname);
        if (issueMatch) {
          const keyOrId = issueMatch[1];
          const found = this.issues.find((i) => i.key.toUpperCase() === keyOrId.toUpperCase() || i.id === keyOrId);

          if (req.method === 'GET') {
            if (!found) {
              return sendJson(404, { errorMessages: [`Issue ${keyOrId} does not exist`], errors: {} });
            }
            return sendJson(200, found);
          }

          if (req.method === 'PUT') {
            let bodyStr = '';
            req.on('data', (chunk) => (bodyStr += chunk));
            req.on('end', () => {
              if (found) {
                try {
                  const updateData = JSON.parse(bodyStr);
                  if (updateData.fields) {
                    Object.assign(found.fields, updateData.fields);
                    found.fields.updated = new Date().toISOString();
                  }
                  return sendJson(200, found);
                } catch {
                  return sendJson(400, { errorMessages: ['Invalid JSON payload'] });
                }
              }
              return sendJson(404, { errorMessages: [`Issue ${keyOrId} not found`] });
            });
            return;
          }
        }

        // 8. Create Issue (/rest/api/2/issue)
        if ((pathname === '/rest/api/2/issue' || pathname === '/rest/api/3/issue') && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => (bodyStr += chunk));
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr);
              const f = body.fields || {};
              const projKey = f.project?.key || 'GRIO';
              const nextNum = this.issues.filter((i) => i.fields.project.key === projKey).length + 3000;
              const newKey = `${projKey}-${nextNum}`;
              const newId = String(Date.now());

              const newIssue: JiraIssue = {
                id: newId,
                key: newKey,
                self: `${this.baseUrl}/rest/api/2/issue/${newKey}`,
                fields: {
                  summary: f.summary || 'Новый запрос',
                  description: f.description || '',
                  issuetype: f.issuetype || { id: '10001', name: 'Сервисный запрос', subtask: false },
                  project: {
                    id: PROJECTS_MAP[projKey]?.id || '10403',
                    key: projKey,
                    name: PROJECTS_MAP[projKey]?.name || 'SRM Project',
                  },
                  status: {
                    id: '10000',
                    name: 'Открыт',
                    statusCategory: { id: 2, key: 'indeterminate', name: 'In Progress', colorName: 'yellow' },
                  },
                  priority: f.priority || { id: '10101', name: 'Medium' },
                  assignee: f.assignee || null,
                  reporter: f.reporter || { name: 'admin', displayName: 'Администратор' },
                  created: new Date().toISOString(),
                  updated: new Date().toISOString(),
                  customfield_10100: f.customfield_10100 || '',
                  customfield_10103: f.customfield_10103 || '',
                  customfield_10104: f.customfield_10104 || '',
                },
              };

              this.issues.unshift(newIssue);
              sendJson(201, { id: newId, key: newKey, self: newIssue.self });
            } catch (err: any) {
              sendJson(400, { errorMessages: [`Failed to create issue: ${err.message}`] });
            }
          });
          return;
        }

        // 9. Root Welcome Page
        if (pathname === '/') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Jira REST API Service — EMS SRM</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f4f5f7; color: #172b4d; }
                .card { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); max-width: 800px; margin: 0 auto; }
                h1 { color: #0052cc; margin-top: 0; }
                .badge { background: #e3fcef; color: #006644; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 13px; }
                .stat { display: inline-block; margin-right: 20px; font-size: 16px; margin-top: 10px; }
                pre { background: #091e420f; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
                ul { line-height: 1.8; }
                a { color: #0052cc; text-decoration: none; }
                a:hover { text-decoration: underline; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>🛠 Jira REST API Mock Service <span class="badge">Running</span></h1>
                <p>Сервис эмуляции Atlassian Jira REST API v2 для интеграции модуля SRM в EMS Platform.</p>
                <div class="stat">📦 Загружено тикетов: <strong>${this.issues.length}</strong></div>
                <div class="stat">📁 Проектов: <strong>${Object.keys(PROJECTS_MAP).length}</strong> (GRIO, GRIO1, GRIO2)</div>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ebecf0;" />
                <h3>Доступные REST API эндпоинты:</h3>
                <ul>
                  <li><a href="/rest/api/2/myself"><code>GET /rest/api/2/myself</code></a> — Проверка авторизации</li>
                  <li><a href="/rest/api/2/serverInfo"><code>GET /rest/api/2/serverInfo</code></a> — Информация о сервере</li>
                  <li><a href="/rest/api/2/project"><code>GET /rest/api/2/project</code></a> — Список проектов</li>
                  <li><a href="/rest/api/2/field"><code>GET /rest/api/2/field</code></a> — Схема полей (включая customfield_10100)</li>
                  <li><a href="/rest/api/2/search?maxResults=10"><code>GET /rest/api/2/search</code></a> — Поиск задач с JQL и пагинацией</li>
                  <li><a href="/health"><code>GET /health</code></a> — Healthcheck</li>
                </ul>
              </div>
            </body>
            </html>
          `);
          return;
        }

        // Fallback 404
        sendJson(404, { errorMessages: [`Endpoint ${pathname} not found`], errors: {} });
      });

      this.server.listen(this.port, () => {
        console.log(`[Jira Server] Running on ${this.baseUrl} (port ${this.port})`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

// Standalone runner
if (require.main === module) {
  const port = parseInt(process.env.PORT || '8080', 10);
  const tempDir = process.env.TEMP_DIR || path.join(__dirname, '../../temp');
  const server = new JiraMockServer(port, process.env.BASE_URL || `http://localhost:${port}`);
  server.loadFromDirectory(tempDir);
  server.start();
}
