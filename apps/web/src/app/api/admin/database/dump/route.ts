import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { safeErrorResponse } from '@/lib/safe-error';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { createDatabaseBackup, DumpMode } from '@/lib/database-backup-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.ADMIN_SETTINGS_MANAGE)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const modeParam = searchParams.get('mode');
    const mode: DumpMode = modeParam === 'data' || modeParam === 'schema' ? modeParam : 'full';

    const backup = await createDatabaseBackup(mode);

    // Фиксация в журнале аудита
    await logAuditEvent({
      userId: user.userId,
      action: 'CREATE',
      entityType: 'DatabaseDump',
      entityId: backup.filename,
      changes: {
        operation: 'DATABASE_DUMP_DOWNLOAD',
        mode,
        filename: backup.filename,
        sizeBytes: backup.sizeBytes,
        method: backup.method,
      },
    });

    return new NextResponse(new Uint8Array(backup.buffer), {
      status: 200,
      headers: {
        'Content-Type': backup.contentType,
        'Content-Disposition': `attachment; filename="${backup.filename}"`,
        'Content-Length': String(backup.sizeBytes),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка при формировании дампа базы данных');
  }
}
