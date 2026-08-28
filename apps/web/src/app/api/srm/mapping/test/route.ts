import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PERMISSIONS } from '@ems/shared';
import { testJiraFieldMapping, JiraFieldMappingConfig } from '@/lib/jira-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'srm-mapping-test' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.SRM_DASHBOARD_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {

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
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка при тестировании маппинга');
  }
}
