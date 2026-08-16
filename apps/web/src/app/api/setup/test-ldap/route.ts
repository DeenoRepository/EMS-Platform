import { NextRequest, NextResponse } from 'next/server';
import ldap from 'ldapjs';

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

    const testPromise = new Promise<{ success: boolean; message?: string; error?: string }>((resolve) => {
      let client: ldap.Client;
      try {
        client = ldap.createClient({
          url,
          timeout: 5000,
          connectTimeout: 5000,
        });
      } catch (err: any) {
        return resolve({ success: false, error: `Некорректный URL: ${err.message}` });
      }

      client.on('error', (err: any) => {
        resolve({ success: false, error: `Ошибка связи с LDAP: ${err.message}` });
      });

      if (bindDn && bindPassword) {
        client.bind(bindDn, bindPassword, (err) => {
          if (err) {
            client.unbind();
            return resolve({
              success: false,
              error: `Ошибка аутентификации Bind DN: ${err.message}`,
            });
          }

          if (searchBase) {
            client.search(
              searchBase,
              {
                scope: 'base',
                filter: '(objectClass=*)',
                timeLimit: 5,
              },
              (searchErr, res) => {
                if (searchErr) {
                  client.unbind();
                  return resolve({
                    success: false,
                    error: `Search Base недоступен: ${searchErr.message}`,
                  });
                }
                res.on('end', () => {
                  client.unbind();
                  resolve({ success: true, message: 'Связь с Active Directory / LDAP подтверждена!' });
                });
                res.on('error', (resErr) => {
                  client.unbind();
                  resolve({ success: false, error: `Ошибка поиска: ${resErr.message}` });
                });
              }
            );
          } else {
            client.unbind();
            resolve({ success: true, message: 'Успешная авторизация Bind DN в LDAP!' });
          }
        });
      } else {
        // Anonymous ping
        client.search('', { scope: 'base', filter: '(objectClass=*)' }, (err) => {
          client.unbind();
          if (err) {
            return resolve({ success: true, message: 'LDAP-сервер ответил на сетевой запрос' });
          }
          resolve({ success: true, message: 'LDAP-сервер доступен' });
        });
      }
    });

    const result = await Promise.race([
      testPromise,
      new Promise<{ success: boolean; error: string }>((resolve) =>
        setTimeout(() => resolve({ success: false, error: 'Превышено время ожидания ответа LDAP (5 сек)' }), 6000)
      ),
    ]);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Ошибка тестирования LDAP' },
      { status: 500 }
    );
  }
}
