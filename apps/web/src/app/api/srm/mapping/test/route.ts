import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { testJiraFieldMapping, JiraFieldMappingConfig } from '@/lib/jira-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.SRM_DASHBOARD_VIEW)) return forbiddenResponse();

    const body = await req.json();
    const { sampleIssue, config }: { sampleIssue: any; config: JiraFieldMappingConfig } = body;

    if (!sampleIssue || !config) {
      return NextResponse.json(
        { success: false, error: 'Передайте образец JSON задачи и конфигурацию сопоставления' },
        { status: 400 }
      );
    }

    const testResult = await testJiraFieldMapping(sampleIssue, config);

    return NextResponse.json({
      success: true,
      data: testResult,
    });
  } catch (error: any) {
    console.error('Ошибка тестирования сопоставления полей Jira:', error);
    return NextResponse.json(
      { success: false, error: `Ошибка при тестировании маппинга: ${error.message || error}` },
      { status: 500 }
    );
  }
}
