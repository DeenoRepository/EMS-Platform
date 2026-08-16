import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-guard';
import { logAuditEvent } from '@ems/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (user) {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
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
    return response;
  } catch (error) {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('ems_session');
    return response;
  }
}
