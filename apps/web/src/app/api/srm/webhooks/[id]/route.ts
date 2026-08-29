import { NextRequest, NextResponse } from 'next/server';
import { prisma, type Prisma } from '@ems/database';
import { logger } from '@/lib/logger';
import { toSafeErrorDetails } from '@/lib/safe-error';
import { applyJiraFieldMapping, getJiraFieldMapping, JiraFieldMappingConfig, notifySrmIncident } from '@/lib/jira-service';
import { extractIssueFromWebhookPayload } from '@/lib/srm-providers';
import { enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_WEBHOOK_BODY_SIZE = 5 * 1024 * 1024; // 5MB

interface SrmWebhookAuthConfig {
  webhookSecret?: string;
  apiToken?: string;
  apiKey?: string;
  token?: string;
  [key: string]: unknown;
}

/**
 * POST /api/srm/webhooks/[id]
 * Прием входящих Push-событий от Jira, Redmine, GitLab и кастомных вебхуков
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const integrationId = (await params).id;
  const rateLimitError = await enforceRateLimit(
    req,
    { limit: 60, windowMs: 60 * 1000, prefix: 'srm-webhook' },
    integrationId
  );
  if (rateLimitError) return rateLimitError;

  try {
    const integration = await prisma.srmIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return NextResponse.json({ success: false, error: 'Интеграция не найдена' }, { status: 404 });
    }

    if (!integration.isActive) {
      return NextResponse.json({ success: false, error: 'Интеграция деактивирована' }, { status: 400 });
    }

    // Проверка секрета вебхука (если задан)
    const auth = (integration.authConfig && typeof integration.authConfig === 'object'
      ? (integration.authConfig as Record<string, unknown>)
      : {}) as SrmWebhookAuthConfig;
    const webhookSecret = auth.webhookSecret || auth.apiToken || auth.apiKey || auth.token;

    if (webhookSecret) {
      const url = new URL(req.url);
      const tokenParam = url.searchParams.get('token') || url.searchParams.get('secret');
      const headerSecret =
        req.headers.get('x-webhook-secret') ||
        req.headers.get('x-gitlab-token') ||
        req.headers.get('x-api-key') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/, '');

      const providedToken = tokenParam || headerSecret;
      // SECURITY FIX: If webhookSecret is configured, ALWAYS require a matching token.
      if (!providedToken || providedToken !== webhookSecret) {
        return NextResponse.json({ success: false, error: 'Неверный или отсутствующий секретный токен вебхука' }, { status: 401 });
      }
    }

    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_WEBHOOK_BODY_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Размер тела запроса превышает допустимый лимит (5 МБ)' },
        { status: 413 }
      );
    }

    const payload = await req.json();
    const rawIssue = extractIssueFromWebhookPayload(payload);

    if (!rawIssue) {
      return NextResponse.json(
        { success: false, error: 'Не удалось извлечь данные задачи из тела вебхука' },
        { status: 400 }
      );
    }

    const allEquipment = await prisma.equipment.findMany({
      take: 1000,
      select: { id: true, name: true, inventoryNumber: true, serialNumber: true },
    });

    const globalMapping = await getJiraFieldMapping();
    const mappingConfig = (integration.mappingConfig as unknown as JiraFieldMappingConfig) || globalMapping;

    const mapped = await applyJiraFieldMapping(rawIssue, mappingConfig, allEquipment);
    const rawDataJson = (rawIssue && typeof rawIssue === 'object' ? rawIssue : {}) as Prisma.InputJsonValue;

    const savedIssue = await prisma.jiraIssueCache.upsert({
      where: { issueKey: mapped.issueKey },
      create: {
        issueKey: mapped.issueKey,
        summary: mapped.summary,
        status: mapped.status,
        priority: mapped.priority,
        issueType: mapped.issueType,
        assignee: mapped.assignee,
        reporter: mapped.reporter,
        createdDate: mapped.createdDate,
        resolvedDate: mapped.resolvedDate,
        equipmentId: mapped.equipmentId,
        integrationId: integration.id,
        rawData: rawDataJson,
        syncedAt: new Date(),
      },
      update: {
        summary: mapped.summary,
        status: mapped.status,
        priority: mapped.priority,
        issueType: mapped.issueType,
        assignee: mapped.assignee,
        reporter: mapped.reporter,
        createdDate: mapped.createdDate,
        resolvedDate: mapped.resolvedDate,
        equipmentId: mapped.equipmentId,
        integrationId: integration.id,
        rawData: rawDataJson,
        syncedAt: new Date(),
      },
    });

    await prisma.srmIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'SUCCESS',
        lastSyncError: null,
      },
    });

    const matchedEq = allEquipment.find((e) => e.id === mapped.equipmentId);
    await notifySrmIncident(mapped, matchedEq?.name);

    return NextResponse.json({
      success: true,
      message: `Вебхук успешно обработан. Задача ${savedIssue.issueKey} сохранена.`,
      data: {
        issueKey: savedIssue.issueKey,
        status: savedIssue.status,
        equipmentId: savedIssue.equipmentId,
      },
    });
  } catch (error: unknown) {
    const details = toSafeErrorDetails(error, 'Внутренняя ошибка обработки вебхука');
    logger.error('Ошибка обработки вебхука SRM', { error: details.logMessage });
    return NextResponse.json(
      { success: false, error: details.publicError },
      { status: 500 }
    );
  }
}
