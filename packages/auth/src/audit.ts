import { prisma, AuditAction } from '@ems/database';

export interface AuditLogParams {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes?: Record<string, { old: any; new: any }> | any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: params.changes || undefined,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error('⚠️ Ошибка записи в AuditLog:', error);
  }
}
