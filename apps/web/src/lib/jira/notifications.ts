import { prisma } from '@ems/database';
import { MILLISECONDS_PER_HOUR, SLA_TARGET_HOURS } from './constants';
import type { JiraIssueData } from './field-mapping';

export async function notifySrmIncident(issue: JiraIssueData, equipmentName?: string) {
  try {
    const priority = (issue.priority || '').toLowerCase();
    const isCritical = ['highest', 'critical', 'blocker', 'high'].includes(priority);
    const createdMs = issue.createdDate ? new Date(issue.createdDate).getTime() : Date.now();
    const isPastSla = !issue.resolvedDate && (Date.now() - createdMs) > SLA_TARGET_HOURS * MILLISECONDS_PER_HOUR;

    if (!isCritical && !isPastSla) return;

    // Находим активных пользователей с правами инженера / администратора
    const targetUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            role: {
              permissions: {
                some: {
                  permission: {
                    code: {
                      in: ['srm.dashboard.view', 'srm.sync.trigger', 'admin.users.manage'],
                    },
                  },
                },
              },
            },
          },
        },
      },
      select: { id: true },
      take: 10,
    });

    if (targetUsers.length === 0) return;

    const title = isPastSla
      ? `Риск срыва SLA: заявка ${issue.issueKey}`
      : `Критический инцидент: ${issue.issueKey}`;

    const message = isPastSla
      ? `Заявка «${issue.summary}» ${equipmentName ? `по оборудованию «${equipmentName}»` : ''} находится в работе без решения более регламентного срока SLA.`
      : `Зарегистрирован аварийный инцидент [${issue.priority}]: «${issue.summary}» ${equipmentName ? `(${equipmentName})` : ''}.`;

    for (const u of targetUsers) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          title,
          message,
          type: 'SLA_BREACH',
          link: `/srm?tab=issues&search=${issue.issueKey}`,
        },
      });
    }
  } catch (err) {
    console.warn('Ошибка отправки уведомления об инциденте SRM:', err);
  }
}
