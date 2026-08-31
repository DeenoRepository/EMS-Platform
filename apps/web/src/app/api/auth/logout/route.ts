import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-guard';
import { enforceRateLimit, getClientIp } from '@/lib/rate-limit';
import { logAuditEvent } from '@ems/auth';

export async function POST(req: NextRequest) {
  const rateLimitRes = await enforceRateLimit(req, {
    limit: 60,
    windowMs: 60_000,
    prefix: 'auth:logout',
  });
  if (rateLimitRes) return rateLimitRes;

  try {
    const user = await getCurrentUser(req);
    if (user) {
      // IP берём через getClientIp(): сырой X-Forwarded-For частично
      // контролируется клиентом и позволяет подделать audit trail.
      const ip = getClientIp(req);
      const userAgent = req.headers.get('user-agent');
      await logAuditEvent({
        userId: user.userId,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: user.userId,
        ipAddress: ip,
        userAgent,
      });
    }

    const response = NextResponse.json({ success: true, message: 'Вы успешно вышли из системы' });
    response.cookies.delete('ems_session');
    response.cookies.delete('ems_token');
    return response;
  } catch (error) {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('ems_session');
    response.cookies.delete('ems_token');
    return response;
  }
}
