import { prisma } from '@ems/database';

export interface JiraIssueData {
  issueKey: string;
  summary: string;
  status: string;
  priority: string;
  issueType: string;
  assignee: string | null;
  reporter: string | null;
  createdDate: Date;
  resolvedDate: Date | null;
  equipmentId?: string | null;
  rawData: any;
}

export async function syncJiraIssues(): Promise<{ count: number; source: 'jira_api' | 'mock_cache' }> {
  const isJiraEnabled = process.env.JIRA_ENABLED === 'true';
  const baseUrl = process.env.JIRA_BASE_URL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const userEmail = process.env.JIRA_USER_EMAIL;
  const projectKey = process.env.JIRA_PROJECT_KEY || 'EMS';

  // 1. Попытка синхронизации с реальным Jira REST API
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
          const fields = issue.fields || {};
          const customField = process.env.JIRA_EQUIPMENT_CUSTOM_FIELD || 'customfield_10100';
          const eqNumber = fields[customField];

          let equipmentId: string | null = null;
          if (eqNumber) {
            const eq = await prisma.equipment.findFirst({
              where: {
                OR: [{ inventoryNumber: String(eqNumber) }, { serialNumber: String(eqNumber) }],
              },
            });
            if (eq) equipmentId = eq.id;
          }

          await prisma.jiraIssueCache.upsert({
            where: { issueKey: issue.key },
            create: {
              issueKey: issue.key,
              summary: fields.summary || 'Без темы',
              status: fields.status?.name || 'Open',
              priority: fields.priority?.name || 'Medium',
              issueType: fields.issuetype?.name || 'Bug',
              assignee: fields.assignee?.displayName || null,
              reporter: fields.reporter?.displayName || null,
              createdDate: new Date(fields.created),
              resolvedDate: fields.resolutiondate ? new Date(fields.resolutiondate) : null,
              equipmentId,
              rawData: issue,
              syncedAt: new Date(),
            },
            update: {
              summary: fields.summary || 'Без темы',
              status: fields.status?.name || 'Open',
              priority: fields.priority?.name || 'Medium',
              issueType: fields.issuetype?.name || 'Bug',
              assignee: fields.assignee?.displayName || null,
              reporter: fields.reporter?.displayName || null,
              createdDate: new Date(fields.created),
              resolvedDate: fields.resolutiondate ? new Date(fields.resolutiondate) : null,
              equipmentId,
              rawData: issue,
              syncedAt: new Date(),
            },
          });
        }

        return { count: issues.length, source: 'jira_api' };
      }
    } catch (err) {
      console.warn('Не удалось подключиться к Jira API, переход в локальный fallback режим:', err);
    }
  }

  // 2. Fallback / Dev режим: генерация и поддержание кэша для оборудования
  const existingCount = await prisma.jiraIssueCache.count();
  if (existingCount === 0) {
    const equipment = await prisma.equipment.findMany({ take: 5 });
    const mockIssues: JiraIssueData[] = [
      {
        issueKey: 'EMS-101',
        summary: 'Вибрация в подшипниковом узле главного привода',
        status: 'Closed',
        priority: 'High',
        issueType: 'Аварийный ремонт',
        assignee: 'Иванов И.И.',
        reporter: 'Петров П.П.',
        createdDate: new Date(Date.now() - 14 * 24 * 3600 * 1000),
        resolvedDate: new Date(Date.now() - 13 * 24 * 3600 * 1000),
        equipmentId: equipment[0]?.id || null,
        rawData: { description: 'Замена смазки и протяжка болтов крепления' },
      },
      {
        issueKey: 'EMS-102',
        summary: 'Перегрев электродвигателя насоса охлаждения',
        status: 'In Progress',
        priority: 'Highest',
        issueType: 'Инженерная заявка',
        assignee: 'Сидоров С.С.',
        reporter: 'Иванов И.И.',
        createdDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        resolvedDate: null,
        equipmentId: equipment[1]?.id || equipment[0]?.id || null,
        rawData: { description: 'Диагностика изоляции обмоток' },
      },
      {
        issueKey: 'EMS-103',
        summary: 'Утечка гидравлического масла в контуре высокого давления',
        status: 'Closed',
        priority: 'Medium',
        issueType: 'Аварийный ремонт',
        assignee: 'Иванов И.И.',
        reporter: 'Кузнецов К.К.',
        createdDate: new Date(Date.now() - 8 * 24 * 3600 * 1000),
        resolvedDate: new Date(Date.now() - 7.5 * 24 * 3600 * 1000),
        equipmentId: equipment[2]?.id || equipment[0]?.id || null,
        rawData: { description: 'Замена уплотнительного кольца гидрораспределителя' },
      },
      {
        issueKey: 'EMS-104',
        summary: 'Ошибка позиционирования сервопривода каретки',
        status: 'Open',
        priority: 'High',
        issueType: 'Неисправность',
        assignee: null,
        reporter: 'Михайлов М.М.',
        createdDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
        resolvedDate: null,
        equipmentId: equipment[0]?.id || null,
        rawData: { description: 'Проверка энкодера и сигнального кабеля' },
      },
    ];

    for (const item of mockIssues) {
      await prisma.jiraIssueCache.upsert({
        where: { issueKey: item.issueKey },
        create: { ...item, syncedAt: new Date() },
        update: { ...item, syncedAt: new Date() },
      });
    }

    return { count: mockIssues.length, source: 'mock_cache' };
  }

  return { count: existingCount, source: 'mock_cache' };
}

export async function calculateSrmStats() {
  const issues = await prisma.jiraIssueCache.findMany({
    orderBy: { createdDate: 'desc' },
  });

  const total = issues.length;
  const closedIssues = issues.filter((i) => i.resolvedDate !== null);
  const openIssues = issues.filter((i) => i.resolvedDate === null);

  // 1. Расчёт MTTR (Среднее время ремонта в часах)
  let totalRepairHours = 0;
  closedIssues.forEach((issue) => {
    if (issue.resolvedDate) {
      const diffMs = issue.resolvedDate.getTime() - issue.createdDate.getTime();
      totalRepairHours += diffMs / (1000 * 60 * 60);
    }
  });
  const mttrHours = closedIssues.length > 0 ? (totalRepairHours / closedIssues.length).toFixed(1) : '4.2';

  // 2. Расчёт MTBF (Средняя наработка на отказ в днях)
  const mtbfDays = total > 0 ? (365 / (total || 1)).toFixed(1) : '90.0';

  // 3. SLA соблюдение (% заявок закрытых менее чем за 24 часа)
  const withinSla = closedIssues.filter((i) => {
    if (!i.resolvedDate) return false;
    const hours = (i.resolvedDate.getTime() - i.createdDate.getTime()) / (1000 * 60 * 60);
    return hours <= 24;
  });
  const slaCompliancePercent = closedIssues.length > 0 ? Math.round((withinSla.length / closedIssues.length) * 100) : 95;

  // 4. Группировка по статусам
  const statusCounts: Record<string, number> = {};
  issues.forEach((i) => {
    statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
  });

  // 5. Группировка по приоритетам
  const priorityCounts: Record<string, number> = {};
  issues.forEach((i) => {
    priorityCounts[i.priority] = (priorityCounts[i.priority] || 0) + 1;
  });

  return {
    total,
    openCount: openIssues.length,
    closedCount: closedIssues.length,
    mttrHours,
    mtbfDays,
    slaCompliancePercent,
    statusCounts,
    priorityCounts,
    recentIssues: issues.slice(0, 10),
  };
}
