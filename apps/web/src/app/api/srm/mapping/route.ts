import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PERMISSIONS } from '@ems/shared';
import {
  getJiraFieldMapping,
  saveJiraFieldMapping,
  DEFAULT_JIRA_FIELD_MAPPING,
  JiraFieldMappingConfig,
} from '@/lib/jira-service';

export const dynamic = 'force-dynamic';

const SAMPLE_JIRA_ISSUE = {
  id: '10042',
  key: 'EMS-205',
  self: 'https://jira.company.local/rest/api/2/issue/10042',
  fields: {
    summary: 'Аварийная остановка шпинделя: перегрев и вибрация',
    description: 'В процессе фрезерования зафиксировано превышение температуры подшипника до 85°C. Требуется ревизия.',
    status: {
      id: '3',
      name: 'In Progress',
      statusCategory: { id: 4, key: 'indeterminate', name: 'In Progress' },
    },
    priority: {
      id: '2',
      name: 'High',
    },
    issuetype: {
      id: '10004',
      name: 'Аварийный ремонт',
      subtask: false,
    },
    assignee: {
      name: 'sidorov',
      displayName: 'Сидоров С.С.',
      emailAddress: 'sidorov@company.local',
    },
    reporter: {
      name: 'petrov',
      displayName: 'Петров П.П.',
      emailAddress: 'petrov@company.local',
    },
    created: '2026-08-15T08:30:00.000+0300',
    updated: '2026-08-16T11:20:00.000+0300',
    resolutiondate: null,
    customfield_10100: 'ИНВ-00104', // Оборудование
    customfield_10042: 4.5,         // Время простоя
    components: [
      { id: '10', name: 'Главный привод шпинделя' },
    ],
    labels: ['critical', 'mechanical'],
  },
};

export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'srm-mapping-get' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.SRM_DASHBOARD_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const config = await getJiraFieldMapping();

    return NextResponse.json({
      success: true,
      data: {
        config,
        defaults: DEFAULT_JIRA_FIELD_MAPPING,
        sampleIssue: SAMPLE_JIRA_ISSUE,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Ошибка получения конфигурации маппинга' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'srm-mapping-put' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, [PERMISSIONS.ADMIN_SETTINGS_MANAGE, PERMISSIONS.SRM_SYNC_TRIGGER]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body: JiraFieldMappingConfig = await req.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Некорректная конфигурация маппинга' }, { status: 400 });
    }

    const updated = await saveJiraFieldMapping(body);

    return NextResponse.json({
      success: true,
      message: 'Конфигурация маппинга полей SRM успешно сохранена',
      data: updated,
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: 'Ошибка сохранения конфигурации маппинга' }, { status: 500 });
  }
}
