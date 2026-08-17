import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { requireAuth } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';
import { calculateSrmStats, syncJiraIssues } from '@/lib/jira-service';

export const dynamic = 'force-dynamic';

// GET /api/srm/stats - Расчет метрик MTTR, MTBF, SLA и распределения поломок
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, PERMISSIONS.SRM_DASHBOARD_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const count = await prisma.jiraIssueCache.count();
    if (count === 0) {
      await syncJiraIssues();
    }

    const stats = await calculateSrmStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Ошибка получения статистики SRM:', error);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
