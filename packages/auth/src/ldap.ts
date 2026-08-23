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
  password: string,
  configOverride?: { ldapUrl?: string; searchBase?: string; ldapEnabled?: boolean }
): Promise<LdapUserResult | null> {
  const ldapEnabled = configOverride?.ldapEnabled !== undefined ? configOverride.ldapEnabled : process.env.LDAP_ENABLED === 'true';
  const ldapUrl = configOverride?.ldapUrl || process.env.LDAP_URL;
  const bindDn = process.env.LDAP_BIND_DN;
  const bindPassword = process.env.LDAP_BIND_PASSWORD;
  const searchBase = configOverride?.searchBase || process.env.LDAP_SEARCH_BASE || '';
  const filterTemplate = process.env.LDAP_SEARCH_FILTER || '(|(sAMAccountName={{username}})(uid={{username}})(userPrincipalName={{username}}))';

  if (!ldapEnabled || !ldapUrl) {
    return null;
  }

  if (!username || !password) {
    return null;
  }

  let client: Client;
  try {
    client = new Client({ url: ldapUrl, timeout: 5000, connectTimeout: 5000 });
  } catch {
    return null;
  }

  try {
    // Mode 1: Search & Bind with Service Account
    if (bindDn && bindPassword && searchBase) {
      await client.bind(bindDn, bindPassword);

      const sanitizedUsername = escapeLdapFilter(username);
      const filter = filterTemplate.replace(/\{\{username\}\}/g, sanitizedUsername);
      const searchOptions = {
        filter,
        scope: 'sub' as const,
        attributes: ['dn', 'displayName', 'cn', 'mail', 'sAMAccountName', 'userPrincipalName'],
      };

      const { searchEntries } = await client.search(searchBase, searchOptions);

      if (searchEntries.length > 0 && searchEntries[0]?.dn) {
        const userEntry = searchEntries[0];
        const userClient = new Client({ url: ldapUrl, timeout: 5000 });
        try {
          await userClient.bind(userEntry.dn, password);
          await userClient.unbind();
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
        } catch {
          try { await userClient.unbind(); } catch {}
          try { await client.unbind(); } catch {}
          return null;
        }
      }

    }

    // Mode 2: Direct User Binding (No service account or direct DN)
    const dnCandidates: string[] = [];
    if (searchBase) {
      dnCandidates.push(`uid=${username},${searchBase}`);
      dnCandidates.push(`cn=${username},${searchBase}`);
      // DC to domain name (e.g. dc=company,dc=local -> company.local)
      const domain = searchBase
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.toLowerCase().startsWith('dc='))
        .map((p) => p.substring(3))
        .join('.');
      if (domain) {
        dnCandidates.push(`${username}@${domain}`);
      }
    }
    dnCandidates.push(username);

    for (const candidateDn of dnCandidates) {
      const userClient = new Client({ url: ldapUrl, timeout: 5000 });
      try {
        await userClient.bind(candidateDn, password);

        let displayName = username;
        let email: string | undefined;

        if (searchBase) {
          try {
            const { searchEntries } = await userClient.search(searchBase, {
              filter: `(|(sAMAccountName=${escapeLdapFilter(username)})(uid=${escapeLdapFilter(username)})(cn=${escapeLdapFilter(username)}))`,
              scope: 'sub',
              attributes: ['displayName', 'cn', 'mail'],
            });
            if (searchEntries.length > 0) {
              const entry = searchEntries[0];
              if (entry.displayName || entry.cn) displayName = String(entry.displayName || entry.cn);
              if (entry.mail) email = String(entry.mail);
            }
          } catch {}
        }

        await userClient.unbind();
        await client.unbind();

        return {
          ldapLogin: username,
          displayName,
          email,
        };
      } catch {
        try { await userClient.unbind(); } catch {}
      }
    }

    await client.unbind();
    return null;
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
  searchFilter?: string;
  testLogin?: string;
  testPassword?: string;
}): Promise<{ success: boolean; message?: string; error?: string; user?: LdapUserResult }> {
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
    // If specific user login and password verification requested:
    if (config.testLogin && config.testPassword) {
      // 1. If service account provided, use Search & User Bind
      if (config.bindDn && config.bindPassword) {
        try {
          await client.bind(config.bindDn, config.bindPassword);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          try { await client.unbind(); } catch {}
          return { success: false, error: `Ошибка авторизации служебного аккаунта (Bind DN): ${errorMsg}` };
        }

        if (!config.searchBase) {
          try { await client.unbind(); } catch {}
          return { success: false, error: 'Для поиска пользователя необходимо указать Search Base' };
        }

        const filterTemplate = config.searchFilter || '(|(sAMAccountName={{username}})(uid={{username}})(userPrincipalName={{username}})(cn={{username}}))';
        const filter = filterTemplate.replace(/\{\{username\}\}/g, escapeLdapFilter(config.testLogin));

        let userEntry: any = null;
        try {
          const { searchEntries } = await client.search(config.searchBase, {
            scope: 'sub',
            filter,
            attributes: ['dn', 'displayName', 'cn', 'mail', 'sAMAccountName'],
          });
          if (searchEntries.length > 0) {
            userEntry = searchEntries[0];
          }
        } catch (searchErr: unknown) {
          const errorMsg = searchErr instanceof Error ? searchErr.message : String(searchErr);
          try { await client.unbind(); } catch {}
          return { success: false, error: `Ошибка поиска пользователя в Search Base: ${errorMsg}` };
        }

        if (!userEntry || !userEntry.dn) {
          // Fallback: check direct DN candidates (e.g. cn=admin,dc=company,dc=local or uid=admin)
          const fallbackCandidates = [
            `cn=${config.testLogin},${config.searchBase}`,
            `uid=${config.testLogin},${config.searchBase}`,
            config.bindDn,
          ].filter(Boolean) as string[];

          let fallbackSuccess = false;
          let fallbackDn = '';

          for (const cand of fallbackCandidates) {
            const fallbackClient = new Client({ url: config.url, timeout: 5000 });
            try {
              await fallbackClient.bind(cand, config.testPassword);
              fallbackSuccess = true;
              fallbackDn = cand;
              await fallbackClient.unbind();
              break;
            } catch {
              try { await fallbackClient.unbind(); } catch {}
            }
          }

          if (fallbackSuccess) {
            try { await client.unbind(); } catch {}
            return {
              success: true,
              message: `Аутентификация администратора в LDAP успешна! (Прямой Bind: ${fallbackDn})`,
              user: {
                ldapLogin: config.testLogin,
                displayName: config.testLogin,
                email: undefined,
              },
            };
          }

          try { await client.unbind(); } catch {}
          return {
            success: false,
            error: `Пользователь с логином «${config.testLogin}» не найден в каталоге LDAP (${config.searchBase})`,
          };
        }

        // Test user binding with provided password
        const userClient = new Client({ url: config.url, timeout: 5000 });
        try {
          await userClient.bind(userEntry.dn, config.testPassword);
          await userClient.unbind();
        } catch (bindErr: unknown) {
          try { await userClient.unbind(); } catch {}
          try { await client.unbind(); } catch {}
          return {
            success: false,
            error: `Пользователь найден («${userEntry.displayName || userEntry.cn || config.testLogin}»), но пароль не подошел. Проверьте пароль в LDAP.`,
          };
        }

        try { await client.unbind(); } catch {}
        const displayName = String(userEntry.displayName || userEntry.cn || config.testLogin);
        const email = userEntry.mail ? String(userEntry.mail) : undefined;

        return {
          success: true,
          message: `Аутентификация администратора в LDAP успешна! Пользователь: «${displayName}» (DN: ${userEntry.dn})`,
          user: {
            ldapLogin: config.testLogin,
            displayName,
            email,
          },
        };
      }

      // 2. Direct user binding test (without service account)
      const dnCandidates: string[] = [];
      if (config.searchBase) {
        dnCandidates.push(`uid=${config.testLogin},${config.searchBase}`);
        dnCandidates.push(`cn=${config.testLogin},${config.searchBase}`);
        const domain = config.searchBase
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p.toLowerCase().startsWith('dc='))
          .map((p) => p.substring(3))
          .join('.');
        if (domain) {
          dnCandidates.push(`${config.testLogin}@${domain}`);
        }
      }
      dnCandidates.push(config.testLogin);

      let lastBindError = '';
      for (const candidateDn of dnCandidates) {
        const userClient = new Client({ url: config.url, timeout: 5000 });
        try {
          await userClient.bind(candidateDn, config.testPassword);

          let displayName = config.testLogin;
          let email: string | undefined;

          if (config.searchBase) {
            try {
              const { searchEntries } = await userClient.search(config.searchBase, {
                filter: `(|(sAMAccountName=${escapeLdapFilter(config.testLogin)})(uid=${escapeLdapFilter(config.testLogin)})(cn=${escapeLdapFilter(config.testLogin)}))`,
                scope: 'sub',
                attributes: ['displayName', 'cn', 'mail'],
              });
              if (searchEntries.length > 0) {
                const entry = searchEntries[0];
                if (entry.displayName || entry.cn) displayName = String(entry.displayName || entry.cn);
                if (entry.mail) email = String(entry.mail);
              }
            } catch {}
          }

          try { await userClient.unbind(); } catch {}
          try { await client.unbind(); } catch {}

          return {
            success: true,
            message: `Прямой LDAP bind успешен! Пользователь «${displayName}» авторизован.`,
            user: {
              ldapLogin: config.testLogin,
              displayName,
              email,
            },
          };
        } catch (err: unknown) {
          lastBindError = err instanceof Error ? err.message : String(err);
          try { await userClient.unbind(); } catch {}
        }
      }

      try { await client.unbind(); } catch {}
      return {
        success: false,
        error: `Не удалось авторизовать пользователя в LDAP: неверный пароль или недоступный DN (${lastBindError || 'Invalid credentials'})`,
      };
    }

    // Default Connection Ping / Bind DN check
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
