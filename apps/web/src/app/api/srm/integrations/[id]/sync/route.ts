import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { syncJiraIssues } from '@/lib/jira-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.SRM_DASHBOARD_VIEW)) return forbiddenResponse();

    const integration = await prisma.srmIntegration.findUnique({
      where: { id: params.id },
    });

    if (!integration) {
      return NextResponse.json({ success: false, error: 'Подключение не найдено' }, { status: 404 });
    }

    const result = await syncJiraIssues(integration.id);

    return NextResponse.json({
      success: true,
      message: `Синхронизация подключения [${integration.name}] завершена. Импортировано/обновлено: ${result.count} заявок`,
      data: result,
    });
  } catch (error: any) {
    console.error('Ошибка синхронизации подключения:', error);
    return NextResponse.json(
      { success: false, error: `Ошибка синхронизации: ${error.message || error}` },
      { status: 500 }
    );
  }
}
