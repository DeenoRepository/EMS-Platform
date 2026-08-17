import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { getSrmAdapter } from '@/lib/srm-providers';

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

    const adapter = getSrmAdapter(integration.providerType);
    const testResult = await adapter.testConnection(integration);

    return NextResponse.json({
      success: testResult.success,
      data: testResult,
    });
  } catch (error: any) {
    console.error('Ошибка проверки соединения:', error);
    return NextResponse.json(
      { success: false, error: `Ошибка при проверке подключения: ${error.message || error}` },
      { status: 500 }
    );
  }
}
