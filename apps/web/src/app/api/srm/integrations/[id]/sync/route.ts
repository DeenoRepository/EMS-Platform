import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { enforceRateLimit } from '@/lib/rate-limit';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { syncJiraIssues } from '@/lib/jira-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitError = await enforceRateLimit(req, { limit: 10, windowMs: 60 * 1000, prefix: 'srm-sync-id' });
  if (rateLimitError) return rateLimitError;

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
