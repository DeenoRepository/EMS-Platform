import { NextRequest, NextResponse } from 'next/server';
import { testLdapConnection } from '@ems/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, bindDn, bindPassword, searchBase } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Укажите URL LDAP-сервера (например, ldap://ad.company.local:389)' },
        { status: 400 }
      );
    }

    const result = await testLdapConnection({
      url,
      bindDn: bindDn || undefined,
      bindPassword: bindPassword || undefined,
      searchBase: searchBase || undefined,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка тестирования LDAP' },
      { status: 500 }
    );
  }
}
