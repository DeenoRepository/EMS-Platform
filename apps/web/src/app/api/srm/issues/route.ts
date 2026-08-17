import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { requireAuth } from '@/lib/auth-guard';
import { PERMISSIONS } from '@ems/shared';
import { syncJiraIssues } from '@/lib/jira-service';

export const dynamic = 'force-dynamic';

// GET /api/srm/issues - Список заявок Jira из локального кэша
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, PERMISSIONS.SRM_DASHBOARD_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get('equipmentId');
    const status = searchParams.get('status');

    // Проверяем наличие записей в кэше, при необходимости инициализируем
    const count = await prisma.jiraIssueCache.count();
    if (count === 0) {
      await syncJiraIssues();
    }

    const where: any = {};
    if (equipmentId) where.equipmentId = equipmentId;
    if (status) where.status = status;

    const issues = await prisma.jiraIssueCache.findMany({
      where,
      orderBy: { createdDate: 'desc' },
    });

    return NextResponse.json({ success: true, data: issues });
  } catch (error: any) {
    console.error('Ошибка получения заявок Jira:', error);
    return NextResponse.json({ success: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
