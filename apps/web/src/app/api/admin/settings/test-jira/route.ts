import { NextRequest } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limit';
import { POST as handleTestSrm } from '../test-srm/route';

export const dynamic = 'force-dynamic';

/**
 * Delegated endpoint for Jira connection testing.
 * Protected by explicit rate limiting (5/min), requireAuth(PERMISSIONS.ADMIN_SETTINGS_MANAGE),
 * SSRF validation (validateOutboundUrl), and safe error handling in the underlying handleTestSrm.
 */
export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 5, windowMs: 60 * 1000, prefix: 'admin-settings-test-jira' });
  if (rateLimitError) return rateLimitError;

  return handleTestSrm(req);
}
