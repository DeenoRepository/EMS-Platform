import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { safeErrorResponse } from '@/lib/safe-error';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitRes = await enforceRateLimit(req, {
    limit: 30,
    windowMs: 60_000,
    prefix: 'eps:reports:templates:delete',
  });
  if (rateLimitRes) return rateLimitRes;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = params;
    const template = await prisma.reportTemplate.findUnique({ where: { id } });

    if (!template) {
      return NextResponse.json({ success: false, error: 'Шаблон не найден' }, { status: 404 });
    }

    if (template.createdById !== user.userId && !hasPermission(user, PERMISSIONS.EPS_REPORTS_MANAGE)) {
      return forbiddenResponse();
    }

    await prisma.reportTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Шаблон удален' });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка удаления шаблона отчета');
  }
}
