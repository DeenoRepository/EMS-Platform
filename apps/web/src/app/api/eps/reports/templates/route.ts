import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW) && !hasPermission(user, PERMISSIONS.EPS_REPORTS_VIEW)) {
      return forbiddenResponse();
    }

    const templates = await prisma.reportTemplate.findMany({
      where: {
        module: 'eps',
        OR: [
          { isPublic: true },
          { createdById: user.userId },
        ],
      },
      include: {
        createdBy: {
          select: { id: true, displayName: true, ldapLogin: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    console.error('Ошибка получения шаблонов отчетов:', error);
    return NextResponse.json({ success: false, error: 'Ошибка получения шаблонов отчетов' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW) && !hasPermission(user, PERMISSIONS.EPS_REPORTS_MANAGE)) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { name, description, config, isPublic = true } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Укажите название шаблона' }, { status: 400 });
    }

    if (!config || !config.selectedColumns || !Array.isArray(config.selectedColumns) || config.selectedColumns.length === 0) {
      return NextResponse.json({ success: false, error: 'Шаблон должен содержать хотя бы одну выбранную колонку' }, { status: 400 });
    }

    const template = await prisma.reportTemplate.create({
      data: {
        module: 'eps',
        name: name.trim(),
        description: description?.trim() || null,
        config,
        isPublic: Boolean(isPublic),
        createdById: user.userId,
      },
      include: {
        createdBy: {
          select: { id: true, displayName: true, ldapLogin: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    console.error('Ошибка сохранения шаблона отчета:', error);
    return NextResponse.json({ success: false, error: 'Ошибка сохранения шаблона отчета' }, { status: 500 });
  }
}
