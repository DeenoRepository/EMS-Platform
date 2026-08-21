import { Client } from 'ldapts';

export interface LdapUserResult {
  ldapLogin: string;
  displayName: string;
  email?: string;
}

export function escapeLdapFilter(input: string): string {
  return input.replace(/[\*\\()\x00\/]/g, (char) => {
    switch (char) {
      case '*':
        return '\\2a';
      case '(':
        return '\\28';
      case ')':
        return '\\29';
      case '\\':
        return '\\5c';
      case '\x00':
        return '\\00';
      case '/':
        return '\\2f';
      default:
        return char;
    }
  });
}

export async function authenticateLdap(
  username: string,
  password: string
): Promise<LdapUserResult | null> {
  const ldapEnabled = process.env.LDAP_ENABLED === 'true';
  const ldapUrl = process.env.LDAP_URL;
  const bindDn = process.env.LDAP_BIND_DN;
  const bindPassword = process.env.LDAP_BIND_PASSWORD;
  const searchBase = process.env.LDAP_SEARCH_BASE;
  const filterTemplate = process.env.LDAP_SEARCH_FILTER || '(sAMAccountName={{username}})';

  if (!ldapEnabled || !ldapUrl || !searchBase) {
    return null;
  }

  let client: Client;
  try {
    client = new Client({ url: ldapUrl, timeout: 5000, connectTimeout: 5000 });
  } catch {
    return null;
  }

  try {
    if (bindDn && bindPassword) {
      await client.bind(bindDn, bindPassword);
    }

    const sanitizedUsername = escapeLdapFilter(username);
    const filter = filterTemplate.replace('{{username}}', sanitizedUsername);
    const searchOptions = {
      filter,
      scope: 'sub' as const,
      attributes: ['dn', 'displayName', 'cn', 'mail', 'sAMAccountName', 'userPrincipalName'],
    };

    const { searchEntries } = await client.search(searchBase, searchOptions);
    
    if (searchEntries.length === 0) {
      await client.unbind();
      return null;
    }

    const userEntry = searchEntries[0];
    
    if (!userEntry || !userEntry.dn) {
      await client.unbind();
      return null;
    }

    // Попытка bind от имени пользователя
    const userClient = new Client({ url: ldapUrl, timeout: 5000 });
    try {
      await userClient.bind(userEntry.dn, password);
      await userClient.unbind();
    } catch {
      await userClient.unbind();
      await client.unbind();
      return null;
    }

    await client.unbind();

    const displayName =
      userEntry.displayName ||
      userEntry.cn ||
      userEntry.sAMAccountName ||
      username;
    const email = userEntry.mail || undefined;

    return {
      ldapLogin: username,
      displayName: String(displayName),
      email: email ? String(email) : undefined,
    };
  } catch (error) {
    try { await client.unbind(); } catch {}
    return null;
  }
}

export async function testLdapConnection(config: {
  url: string;
  bindDn?: string;
  bindPassword?: string;
  searchBase?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  let client: Client;
  try {
    client = new Client({
      url: config.url,
      timeout: 5000,
      connectTimeout: 5000,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Некорректный URL: ${errorMsg}` };
  }

  try {
    if (config.bindDn && config.bindPassword) {
      try {
        await client.bind(config.bindDn, config.bindPassword);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        try { await client.unbind(); } catch {}
        return {
          success: false,
          error: `Ошибка аутентификации Bind DN: ${errorMsg}`,
        };
      }

      if (config.searchBase) {
        try {
          await client.search(config.searchBase, {
            scope: 'base',
            filter: '(objectClass=*)',
            sizeLimit: 1,
            timeLimit: 5,
          });
          try { await client.unbind(); } catch {}
          return { success: true, message: 'Связь с Active Directory / LDAP подтверждена!' };
        } catch (searchErr: unknown) {
          const errorMsg = searchErr instanceof Error ? searchErr.message : String(searchErr);
          try { await client.unbind(); } catch {}
          return {
            success: false,
            error: `Search Base недоступен (или ошибка поиска): ${errorMsg}`,
          };
        }
      } else {
        try { await client.unbind(); } catch {}
        return { success: true, message: 'Успешная авторизация Bind DN в LDAP!' };
      }
    } else {
      try {
        await client.search('', { scope: 'base', filter: '(objectClass=*)', sizeLimit: 1, timeLimit: 5 });
      } catch (err: unknown) {
        try { await client.unbind(); } catch {}
        return { success: true, message: 'LDAP-сервер ответил на сетевой запрос (без авторизации)' };
      }
      try { await client.unbind(); } catch {}
      return { success: true, message: 'LDAP-сервер доступен' };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    try { await client.unbind(); } catch {}
    return { success: false, error: `Ошибка связи с LDAP: ${errorMsg}` };
  }
}
