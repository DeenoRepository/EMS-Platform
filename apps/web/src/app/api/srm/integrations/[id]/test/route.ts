import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { getSrmAdapter } from '@/lib/srm-providers';
import { logger } from '@/lib/logger';
import { toSafeErrorDetails } from '@/lib/safe-error';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, [PERMISSIONS.SRM_SYNC_TRIGGER, PERMISSIONS.ADMIN_SETTINGS_MANAGE]);
  if (auth.errorResponse) return auth.errorResponse;

  try {

    const integration = await prisma.srmIntegration.findUnique({
      where: { id: params.id },
    });

    if (!integration) {
      return NextResponse.json({ success: false, error: 'Подключение не найдено' }, { status: 404 });
    }

    const adapter = getSrmAdapter(integration.providerType);
    const testResult = await adapter.testConnection(integration);

    return NextResponse.json({
      success: testResult.success,
      data: testResult,
    });
  } catch (error: unknown) {
    const details = toSafeErrorDetails(error, 'Ошибка при проверке подключения');
    logger.error('Ошибка проверки соединения SRM', { error: details.logMessage, integrationId: params.id });
    return NextResponse.json(
      { success: false, error: details.publicError },
      { status: 500 }
    );
  }
}
