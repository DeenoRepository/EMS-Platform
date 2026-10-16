import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { matchFileNameWithDatabase } from '@/lib/eps-document-matcher';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, {
    limit: 60,
    windowMs: 60 * 1000,
    prefix: 'eps-documents-match',
  });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_VIEW) &&
      !hasPermission(user, PERMISSIONS.EPS_DOCUMENTS_UPLOAD) &&
      !user.roles.includes('admin')
    ) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const { fileName, fileNames } = body;

    if (!fileName && (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Укажите fileName или список fileNames для сопоставления' },
        { status: 400 }
      );
    }

    if (fileName && typeof fileName === 'string') {
      const match = await matchFileNameWithDatabase(fileName, prisma);
      return NextResponse.json({
        success: true,
        data: {
          match,
          matches: [match],
        },
      });
    }

    const names = (fileNames as unknown[]).filter((n): n is string => typeof n === 'string');
    const matches = await Promise.all(
      names.map((name) => matchFileNameWithDatabase(name, prisma))
    );

    return NextResponse.json({
      success: true,
      data: {
        match: matches[0] || null,
        matches,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка сопоставления документа с реестром оборудования:', message);
    return NextResponse.json(
      { success: false, error: 'Ошибка сопоставления документа', details: message },
      { status: 500 }
    );
  }
}
