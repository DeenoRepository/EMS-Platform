import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { requireAuth } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { logger } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/rate-limit';
import { PERMISSIONS } from '@ems/shared';
import { syncJiraIssues, createInternalServiceRequest, SrmNotConfiguredError } from '@/lib/jira-service';

export const dynamic = 'force-dynamic';

// GET /api/srm/issues - Список инцидентов и сервисных заявок с фильтрацией и связями
export async function GET(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 120, windowMs: 60 * 1000, prefix: 'srm-issues-get' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.SRM_DASHBOARD_VIEW);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const equipmentId = searchParams.get('equipmentId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const source = searchParams.get('source');
    const failureCategory = searchParams.get('failureCategory');
    const integrationId = searchParams.get('integrationId');
    const warrantyOnly = searchParams.get('warrantyOnly') === 'true';
    const search = searchParams.get('search');

    // Проверяем наличие записей в кэше, при необходимости инициализируем
    const count = await prisma.jiraIssueCache.count();
    if (count === 0) {
      try {
        await syncJiraIssues();
      } catch (syncError: unknown) {
        if (!(syncError instanceof SrmNotConfiguredError)) throw syncError;
        // Expected state before any SRM integration is configured — not an
        // operational failure, so no error-level log noise (see
        // docs/quality/inspections/2026-08-31-release-readiness-inspection.md §5).
        logger.info('SRM issues requested before any integration is configured', {
          endpoint: 'srm-issues-get',
        });
      }
    }

    const where: any = {};
    if (equipmentId && equipmentId !== 'ALL') where.equipmentId = equipmentId;
    if (status && status !== 'ALL') where.status = status;
    if (priority && priority !== 'ALL') where.priority = priority;
    if (source && source !== 'ALL') where.source = source;
    if (failureCategory && failureCategory !== 'ALL') where.failureCategory = failureCategory;
    if (integrationId && integrationId !== 'ALL') where.integrationId = integrationId;
    if (warrantyOnly) where.warrantyClaim = true;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { issueKey: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { assignee: { contains: q, mode: 'insensitive' } },
        { reporter: { contains: q, mode: 'insensitive' } },
        { contractorName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const issues = await prisma.jiraIssueCache.findMany({
      where,
      include: {
        integration: {
          select: {
            id: true,
            name: true,
            providerType: true,
          },
        },
      },
      orderBy: { createdDate: 'desc' },
    });

    // Обогащаем данными об оборудовании
    const eqIds = issues.map((i) => i.equipmentId).filter(Boolean) as string[];
    const equipments = await prisma.equipment.findMany({
      where: { id: { in: eqIds } },
      select: {
        id: true,
        name: true,
        inventoryNumber: true,
        serialNumber: true,
        status: true,
        manufacturer: true,
        model: true,
      },
    });
    const eqMap = new Map(equipments.map((e) => [e.id, e]));

    const enrichedIssues = issues.map((issue) => ({
      ...issue,
      equipment: issue.equipmentId ? eqMap.get(issue.equipmentId) || null : null,
    }));

    return NextResponse.json({ success: true, data: enrichedIssues });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка получения заявок SRM');
  }
}

// POST /api/srm/issues - Создание внутренней сервисной заявки
export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 30, windowMs: 60 * 1000, prefix: 'srm-issues-post' });
  if (rateLimitError) return rateLimitError;

  const auth = await requireAuth(req, PERMISSIONS.SRM_REQUESTS_CREATE);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      summary,
      description,
      priority = 'MEDIUM',
      issueType = 'INCIDENT',
      failureCategory = 'OTHER',
      equipmentId,
      assignee,
      warrantyClaim = false,
      contractorName,
    } = body;

    if (!summary || !summary.trim()) {
      return NextResponse.json({ success: false, error: 'Укажите тему инцидента или неисправности' }, { status: 400 });
    }

    const user = auth.user;
    const issue = await createInternalServiceRequest({
      summary: summary.trim(),
      description: description ? description.trim() : '',
      priority: priority.toUpperCase(),
      issueType,
      failureCategory,
      equipmentId: equipmentId || undefined,
      reporter: user?.displayName || user?.ldapLogin || 'Сотрудник EMS',
      createdById: user?.userId,
      assignee: assignee ? assignee.trim() : undefined,
      warrantyClaim: Boolean(warrantyClaim),
      contractorName: contractorName ? contractorName.trim() : undefined,
    });

    // Аудит лог
    try {
      await prisma.auditLog.create({
        data: {
          userId: user?.userId,
          action: 'CREATE',
          entityType: 'SrmIssue',
          entityId: issue.id,
          changes: {
            issueKey: { old: null, new: issue.issueKey },
            summary: { old: null, new: issue.summary },
            priority: { old: null, new: issue.priority },
            equipmentId: { old: null, new: issue.equipmentId },
          },
        },
      });
    } catch (error) {
      logger.warn('Не удалось записать лог аудита SRM', {
        endpoint: 'srm-issues-create',
        issueId: issue.id,
        error,
      });
    }

    return NextResponse.json({ success: true, data: issue, message: `Заявка ${issue.issueKey} успешно зарегистрирована` }, { status: 201 });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка создания заявки');
  }
}

