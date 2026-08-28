import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { safeErrorResponse } from '@/lib/safe-error';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { analyzeEquipmentImportFile } from '@/lib/eps-import-matcher';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rateLimitRes = await enforceRateLimit(req, {
    limit: 10,
    windowMs: 60_000,
    prefix: 'eps:import:analyze',
  });
  if (rateLimitRes) return rateLimitRes;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW) && !hasPermission(user, PERMISSIONS.EPS_IMPORT_EXECUTE)) {
      return forbiddenResponse();
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Файл не загружен' }, { status: 400 });
    }

    const result = await analyzeEquipmentImportFile(file);
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка анализа файла импорта');
  }
}
