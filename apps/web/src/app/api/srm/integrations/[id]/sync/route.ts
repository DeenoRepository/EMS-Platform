import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { syncJiraIssues } from '@/lib/jira-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, [PERMISSIONS.SRM_SYNC_TRIGGER, PERMISSIONS.ADMIN_SETTINGS_MANAGE]);
  if (auth.errorResponse) return auth.errorResponse;

  try {

    const integration = await prisma.srmIntegration.findUnique({
      where: { id: (await params).id },
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
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка синхронизации подключения');
  }
}
