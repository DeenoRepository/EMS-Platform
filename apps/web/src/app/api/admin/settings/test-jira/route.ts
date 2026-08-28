import { NextRequest } from 'next/server';
import { POST as handleTestSrm } from '../test-srm/route';

export const dynamic = 'force-dynamic';

/**
 * Delegated endpoint for Jira connection testing.
 * Protected by requireAuth(PERMISSIONS.ADMIN_SETTINGS_MANAGE), rate limiting (5/min),
 * SSRF validation (validateOutboundUrl), and safe error handling in the underlying handleTestSrm.
 */
export async function POST(req: NextRequest) {
  return handleTestSrm(req);
}
