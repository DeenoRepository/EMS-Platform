import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PERMISSIONS } from '@ems/shared';
import { calculateAdvancedRamsMetrics } from '@/lib/jira-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/srm/analytics/reliability - Комплексная RAMS и RCM аналитика надежности оборудования
export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 60, windowMs: 60 * 1000, prefix: 'srm-reliability-get' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.SRM_DASHBOARD_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get('equipmentId') || undefined;

    const data = await calculateAdvancedRamsMetrics(equipmentId);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    logger.error('Failed to calculate SRM RAMS reliability analytics', {
      endpoint: 'srm-reliability-get',
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера при расчете аналитических метрик' },
      { status: 500 }
    );
  }
}
