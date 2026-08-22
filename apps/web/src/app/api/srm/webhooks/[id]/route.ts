import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@ems/database';
import { applyJiraFieldMapping, getJiraFieldMapping, JiraFieldMappingConfig, notifySrmIncident } from '@/lib/jira-service';
import { extractIssueFromWebhookPayload } from '@/lib/srm-providers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/srm/webhooks/[id]
 * Прием входящих Push-событий от Jira, Redmine, GitLab и кастомных вебхуков
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const integrationId = params.id;

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
    const auth = (integration.authConfig as any) || {};
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
      if (providedToken && providedToken !== webhookSecret) {
        return NextResponse.json({ success: false, error: 'Неверный секретный токен вебхука' }, { status: 401 });
      }
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
      select: { id: true, name: true, inventoryNumber: true, serialNumber: true },
    });

    const globalMapping = await getJiraFieldMapping();
    const mappingConfig = (integration.mappingConfig as unknown as JiraFieldMappingConfig) || globalMapping;

    const mapped = await applyJiraFieldMapping(rawIssue, mappingConfig, allEquipment);

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
        rawData: rawIssue,
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
        rawData: rawIssue,
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
  } catch (error: any) {
    console.error('Ошибка обработки вебхука SRM:', error);
    return NextResponse.json(
      { success: false, error: `Внутренняя ошибка обработки вебхука: ${error.message || error}` },
      { status: 500 }
    );
  }
}
