import { prisma } from '@ems/database';
import { logger } from '../logger';
import { getSystemSettings } from '../system-settings-service';
import { applyJiraFieldMapping, getJiraFieldMapping, type JiraFieldMappingConfig } from './field-mapping';

export async function syncJiraIssues(targetIntegrationId?: string): Promise<{ count: number; source: string }> {
  const allEquipment = await prisma.equipment.findMany({
    select: { id: true, name: true, inventoryNumber: true, serialNumber: true },
  });

  const defaultGlobalMapping = await getJiraFieldMapping();

  // 1. Проверяем наличие настроенных интеграций в базе данных
  const integrationWhere: any = { isActive: true };
  if (targetIntegrationId) {
    integrationWhere.id = targetIntegrationId;
  }

  const integrations = await prisma.srmIntegration.findMany({
    where: integrationWhere,
  });

  if (integrations.length > 0) {
    const { getSrmAdapter } = await import('../srm-providers');
    let totalImported = 0;

    for (const integration of integrations) {
      try {
        const adapter = getSrmAdapter(integration.providerType);
        const rawIssues = await adapter.fetchIssues(integration);

        const mappingConfig = (integration.mappingConfig as unknown as JiraFieldMappingConfig) || defaultGlobalMapping;

        for (const rawIssue of rawIssues) {
          const mapped = await applyJiraFieldMapping(rawIssue, mappingConfig, allEquipment);

          await prisma.jiraIssueCache.upsert({
            where: { issueKey: mapped.issueKey },
            create: {
              issueKey: mapped.issueKey,
              summary: mapped.summary,
              status: mapped.status,
              priority: mapped.priority,
              issueType: mapped.issueType,
              assignee: mapped.assignee,
              reporter: mapped.reporter,
              createdDate: mapped.createdDate,
              resolvedDate: mapped.resolvedDate,
              equipmentId: mapped.equipmentId,
              integrationId: integration.id,
              rawData: rawIssue as any,
              syncedAt: new Date(),
            },
            update: {
              summary: mapped.summary,
              status: mapped.status,
              priority: mapped.priority,
              issueType: mapped.issueType,
              assignee: mapped.assignee,
              reporter: mapped.reporter,
              createdDate: mapped.createdDate,
              resolvedDate: mapped.resolvedDate,
              equipmentId: mapped.equipmentId,
              integrationId: integration.id,
              rawData: rawIssue as any,
              syncedAt: new Date(),
            },
          });
          totalImported++;
        }

        await prisma.srmIntegration.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'SUCCESS',
            lastSyncError: null,
          },
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error(`Ошибка синхронизации интеграции [${integration.name}]`, { error: errMsg, integrationId: integration.id });
        await prisma.srmIntegration.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'ERROR',
            lastSyncError: errMsg,
          },
        });
      }
    }

    return { count: totalImported, source: 'SRM Providers Adapter' };
  }

  // 2. Fallback на устаревшие SystemSettings (обратная совместимость)
  const settings = (await getSystemSettings()) as any;
  const jiraUrl = settings?.jiraUrl || process.env.JIRA_HOST;
  const jiraUser = settings?.jiraUsername || process.env.JIRA_USERNAME;
  const jiraToken = settings?.jiraApiToken || process.env.JIRA_API_TOKEN;
  const jql = settings?.jiraJql || process.env.JIRA_JQL || 'project = EMS ORDER BY created DESC';

  if (!jiraUrl) {
    throw new Error('Подключение к Jira / SRM не настроено. Перейдите в раздел Интеграции SRM.');
  }

  const authHeader = jiraUser && jiraToken
    ? `Basic ${Buffer.from(`${jiraUser}:${jiraToken}`).toString('base64')}`
    : jiraToken
    ? `Bearer ${jiraToken}`
    : undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const cleanUrl = jiraUrl.replace(/\/+$/, '');
  const searchUrl = `${cleanUrl}/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=100`;

  const response = await fetch(searchUrl, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Jira API returned status ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const issues = data.issues || [];

  for (const issue of issues) {
    const mapped = await applyJiraFieldMapping(issue, defaultGlobalMapping, allEquipment);

    await prisma.jiraIssueCache.upsert({
      where: { issueKey: mapped.issueKey },
      create: {
        issueKey: mapped.issueKey,
        summary: mapped.summary,
        status: mapped.status,
        priority: mapped.priority,
        issueType: mapped.issueType,
        assignee: mapped.assignee,
        reporter: mapped.reporter,
        createdDate: mapped.createdDate,
        resolvedDate: mapped.resolvedDate,
        equipmentId: mapped.equipmentId,
        rawData: issue as any,
        syncedAt: new Date(),
      },
      update: {
        summary: mapped.summary,
        status: mapped.status,
        priority: mapped.priority,
        issueType: mapped.issueType,
        assignee: mapped.assignee,
        reporter: mapped.reporter,
        createdDate: mapped.createdDate,
        resolvedDate: mapped.resolvedDate,
        equipmentId: mapped.equipmentId,
        rawData: issue as any,
        syncedAt: new Date(),
      },
    });
  }

  logger.info(`Синхронизировано ${issues.length} инцидентов Jira (legacy config)`);
  return { count: issues.length, source: 'Legacy Jira Service' };
}
