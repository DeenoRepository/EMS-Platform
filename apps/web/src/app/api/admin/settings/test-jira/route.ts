import { NextRequest, NextResponse } from 'next/server';
import { POST as handleTestSrm } from '../test-srm/route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return handleTestSrm(req);
}
