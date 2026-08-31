import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { requireAuth } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PERMISSIONS } from '@ems/shared';
import { calculateSrmStats, syncJiraIssues, SrmNotConfiguredError } from '@/lib/jira-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/srm/stats - Расчет метрик MTTR, MTBF, SLA и распределения поломок
export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'srm-stats-get' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.SRM_DASHBOARD_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const count = await prisma.jiraIssueCache.count();
    if (count === 0) {
      try {
        await syncJiraIssues();
      } catch (syncError: unknown) {
        if (!(syncError instanceof SrmNotConfiguredError)) throw syncError;
        // Expected state on a fresh install / before any SRM integration is
        // configured — not an operational failure, so no error-level log
        // noise (see docs/quality/inspections/2026-08-31-release-readiness-inspection.md §5).
        logger.info('SRM stats requested before any integration is configured', {
          endpoint: 'srm-stats-get',
        });
      }
    }

    const stats = await calculateSrmStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: unknown) {
    logger.error('Failed to get SRM stats', {
      endpoint: 'srm-stats-get',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
