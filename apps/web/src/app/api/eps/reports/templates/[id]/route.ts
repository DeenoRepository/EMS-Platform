import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
  } catch (error: any) {
    console.error('Ошибка удаления шаблона отчета:', error);
    return NextResponse.json({ success: false, error: 'Ошибка удаления шаблона отчета' }, { status: 500 });
  }
}
