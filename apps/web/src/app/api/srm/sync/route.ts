import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PERMISSIONS } from '@ems/shared';
import { syncJiraIssues } from '@/lib/jira-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST /api/srm/sync - Принудительная синхронизация с Jira API
export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 10, windowMs: 60 * 1000, prefix: 'srm-sync-post' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, [PERMISSIONS.SRM_SYNC_TRIGGER, PERMISSIONS.ADMIN_SETTINGS_MANAGE]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const result = await syncJiraIssues();
    return NextResponse.json({
      success: true,
      message: `Синхронизировано заявок: ${result.count}`,
      source: result.source,
    });
  } catch (error: unknown) {
    logger.error('Failed to sync Jira issues', {
      endpoint: 'srm-sync-post',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Сбой синхронизации с Jira' }, { status: 500 });
  }
}
