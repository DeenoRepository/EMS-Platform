import path from 'node:path';
import { prisma } from '@ems/database';
import { hasPermission } from '@ems/auth';
import { JwtUserPayload, PERMISSIONS } from '@ems/shared';

export type StoredFileResource =
  | { kind: 'equipment-document'; filePath: string }
  | { kind: 'equipment-photo'; filePath: string }
  | { kind: 'feedback-attachment'; filePath: string };

export function normalizeStoredFilePath(parts: string[]): string | null {
  if (
    parts.length === 0 ||
    parts.some((part) => !part || part === '.' || part === '..' || part.includes('\\') || part.includes('\u0000'))
  ) {
    return null;
  }

  const relativePath = path.posix.normalize(parts.join('/')).replace(/^\/+/, '');
  if (!relativePath || relativePath === '.' || relativePath.startsWith('../') || relativePath.includes('/../')) {
    return null;
  }
  return relativePath;
}

export async function findStoredFileResource(filePath: string): Promise<StoredFileResource | null> {
  const [document, photo, attachment] = await Promise.all([
    prisma.document.findFirst({
      where: { filePath, deletedAt: null },
      select: { filePath: true },
    }),
    prisma.photo.findFirst({
      where: { filePath },
      select: { filePath: true },
    }),
    prisma.feedbackAttachment.findFirst({
      where: {
        filePath,
        ticket: { deletedAt: null },
      },
      select: { filePath: true },
    }),
  ]);

  if (document) return { kind: 'equipment-document', filePath: document.filePath };
  if (photo) return { kind: 'equipment-photo', filePath: photo.filePath };
  if (attachment) return { kind: 'feedback-attachment', filePath: attachment.filePath };
  return null;
}

export function canReadFeedbackAttachment(user: JwtUserPayload, ticketCreatorId: string): boolean {
  return hasPermission(user, PERMISSIONS.ADMIN_FEEDBACK_MANAGE) || ticketCreatorId === user.userId;
}

export async function canReadStoredFile(
  user: JwtUserPayload,
  resource: StoredFileResource
): Promise<boolean> {
  if (resource.kind === 'feedback-attachment') {
    const attachment = await prisma.feedbackAttachment.findFirst({
      where: {
        filePath: resource.filePath,
        ticket: { deletedAt: null },
      },
      select: { ticket: { select: { createdById: true } } },
    });

    return Boolean(attachment && canReadFeedbackAttachment(user, attachment.ticket.createdById));
  }

  return hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_VIEW);
}
