import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@ems/auth';
import { JwtUserPayload } from '@ems/shared';

export async function getCurrentUser(req?: NextRequest): Promise<JwtUserPayload | null> {
  // 1. Попытка извлечь токен из cookie
  let token: string | undefined;

  try {
    const cookieStore = cookies();
    token = cookieStore.get('ems_session')?.value;
  } catch {
    // Fallback if called in context where cookies() is not directly available
  }

  // 2. Попытка извлечь токен из заголовка Authorization
  if (!token && req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return null;
  }

  return await verifySessionToken(token);
}

export function unauthorizedResponse(message = 'Требуется авторизация') {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Недостаточно прав для выполнения операции') {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}
