import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/srm/webhooks/[id]
 * Decommissioned webhook endpoint: returns 200 OK with retired status
 * to prevent external webhooks (Jira, GitLab, Redmine) from looping infinite retries.
 */
export async function POST(req: NextRequest) {
  return NextResponse.json({
    success: true,
    status: 'retired',
    message: 'SRM webhooks receiver has been retired from the active platform.',
  });
}
