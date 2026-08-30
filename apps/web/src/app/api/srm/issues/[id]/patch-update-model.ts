import type { Prisma } from '@ems/database';

const RESOLVED_STATUS_MARKERS = ['CLOSED', 'RESOLVED', 'DONE', 'РЕШЕН', 'ГОТОВ', 'ЗАКРЫТ'];

type ExistingIssue = {
  resolvedDate: Date | null;
  downtimeMinutes: number | null;
  createdDate: Date;
};

type SrmIssuePatchBody = {
  status?: unknown;
  priority?: unknown;
  assignee?: unknown;
  resolutionNotes?: unknown;
  downtimeMinutes?: unknown;
  failureCategory?: unknown;
  warrantyClaim?: unknown;
  contractorName?: unknown;
  equipmentId?: unknown;
};

export type SrmIssuePatchModel = {
  dataToUpdate: Prisma.JiraIssueCacheUpdateInput;
  isNowResolved: boolean;
};

function isResolvedStatus(status: unknown): boolean {
  return typeof status === 'string'
    && RESOLVED_STATUS_MARKERS.some((marker) => status.toUpperCase().includes(marker));
}

export function buildSrmIssuePatchModel(
  body: SrmIssuePatchBody,
  existing: ExistingIssue,
  now = Date.now(),
): SrmIssuePatchModel {
  const dataToUpdate: Prisma.JiraIssueCacheUpdateInput = {};
  const fields = [
    'status',
    'priority',
    'assignee',
    'resolutionNotes',
    'failureCategory',
    'contractorName',
    'equipmentId',
  ] as const;

  for (const field of fields) {
    if (body[field] !== undefined) dataToUpdate[field] = body[field] as never;
  }
  if (body.downtimeMinutes !== undefined) dataToUpdate.downtimeMinutes = Number(body.downtimeMinutes) || 0;
  if (body.warrantyClaim !== undefined) dataToUpdate.warrantyClaim = Boolean(body.warrantyClaim);

  const isNowResolved = isResolvedStatus(body.status);
  if (isNowResolved && !existing.resolvedDate) {
    dataToUpdate.resolvedDate = new Date(now);
    if (body.downtimeMinutes === undefined && !existing.downtimeMinutes) {
      dataToUpdate.downtimeMinutes = Math.round((now - existing.createdDate.getTime()) / (1000 * 60));
    }
  }

  return { dataToUpdate, isNowResolved };
}
