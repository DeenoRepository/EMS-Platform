import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';
import { calculateAdvancedRamsMetrics } from '@/lib/jira-service';

export const dynamic = 'force-dynamic';

// GET /api/srm/analytics/reliability - Комплексная RAMS и RCM аналитика надежности оборудования
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, PERMISSIONS.SRM_DASHBOARD_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get('equipmentId') || undefined;

    const data = await calculateAdvancedRamsMetrics(equipmentId);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Ошибка расчета RAMS аналитики надежности SRM:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера при расчете аналитических метрик' },
      { status: 500 }
    );
  }
}
