import { prisma } from '@ems/database';
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
              rawData: rawIssue,
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
              rawData: rawIssue,
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
      } catch (err: any) {
        console.error(`Ошибка синхронизации интеграции [${integration.name}]:`, err);
        await prisma.srmIntegration.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'ERROR',
            lastSyncError: err.message || String(err),
          },
        });
      }
    }

    return { count: totalImported, source: 'srm_integrations' };
  }

  // 2. Fallback на системные параметры из БД / .env (legacy Jira)
  const sysSettings = await getSystemSettings();
  const isJiraEnabled = process.env.JIRA_ENABLED === 'true' || Boolean(sysSettings.JIRA_BASE_URL);
  const baseUrl = sysSettings.JIRA_BASE_URL || process.env.JIRA_BASE_URL || process.env.JIRA_HOST;
  const apiToken = process.env.JIRA_API_TOKEN;
  const userEmail = process.env.JIRA_USER_EMAIL || process.env.JIRA_EMAIL;
  const projectKey = sysSettings.JIRA_PROJECT_KEY || process.env.JIRA_PROJECT_KEY || 'EMS';

  if (isJiraEnabled && baseUrl && apiToken && userEmail) {
    try {
      const authHeader = `Basic ${Buffer.from(`${userEmail}:${apiToken}`).toString('base64')}`;
      const res = await fetch(`${baseUrl}/rest/api/2/search?jql=project=${projectKey} ORDER BY created DESC`, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        const issues: any[] = data.issues || [];

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
              rawData: issue,
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
              rawData: issue,
              syncedAt: new Date(),
            },
          });
        }

        return { count: issues.length, source: 'jira_env_api' };
      }
    } catch (err) {
      console.warn('Не удалось подключиться к Jira по .env, переход в локальный fallback:', err);
    }
  }

  const existingCount = await prisma.jiraIssueCache.count();
  return { count: existingCount, source: existingCount > 0 ? 'srm_cache' : 'none' };
}
