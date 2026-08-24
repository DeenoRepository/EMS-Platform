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

export function constructUserPrincipalName(username: string, searchBase?: string, ldapUrl?: string): string {
  const cleanUser = username.trim();
  if (!cleanUser) return '';

  // 1. If already in UPN format (user@domain) or NetBIOS format (DOMAIN\user), use as-is
  if (cleanUser.includes('@') || cleanUser.includes('\\')) {
    return cleanUser;
  }

  // 2. Extract domain from searchBase (dc=nzpp,dc=ru -> nzpp.ru)
  if (searchBase) {
    const dcParts = searchBase
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.toLowerCase().startsWith('dc='))
      .map((p) => p.substring(3));

    if (dcParts.length > 0) {
      return `${cleanUser}@${dcParts.join('.')}`;
    }
  }

  // 3. Extract domain from ldapUrl (ldap://ad-dc-nzpp-02.nzpp.ru:389)
  if (ldapUrl) {
    try {
      const parsed = new URL(ldapUrl);
      const host = parsed.hostname;
      if (host) {
        const parts = host.split('.');
        if (parts.length >= 2) {
          return `${cleanUser}@${parts.slice(-2).join('.')}`;
        }
      }
    } catch {}
  }

  return cleanUser;
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

  if (!ldapEnabled || !ldapUrl || !username || !password) {
    return null;
  }

  const client = new Client({ url: ldapUrl, timeout: 5000, connectTimeout: 5000 });

  const hasServiceAccount = Boolean(bindDn && bindDn.trim() && bindPassword && bindPassword.trim());

  try {
    // Mode 1: Search & Bind with Service Account (only if valid service credentials configured)
    if (hasServiceAccount && searchBase) {
      try {
        await client.bind(bindDn!, bindPassword!);

        const sanitizedUsername = escapeLdapFilter(username);
        const filter = filterTemplate.replace(/\{\{username\}\}/g, sanitizedUsername);
        const { searchEntries } = await client.search(searchBase, {
          filter,
          scope: 'sub' as const,
          attributes: ['dn', 'displayName', 'cn', 'mail', 'sAMAccountName', 'userPrincipalName'],
        });

        if (searchEntries.length > 0 && searchEntries[0]?.dn) {
          const userEntry = searchEntries[0];
          const userClient = new Client({ url: ldapUrl, timeout: 5000 });
          try {
            await userClient.bind(userEntry.dn, password);
            await userClient.unbind();
            await client.unbind();

            const displayName = userEntry.displayName || userEntry.cn || userEntry.sAMAccountName || username;
            const email = userEntry.mail || undefined;

            return {
              ldapLogin: username,
              displayName: String(displayName),
              email: email ? String(email) : undefined,
            };
          } catch (bindErr: any) {
            console.warn('[LDAP USER BIND ERROR]:', bindErr?.message);
            try { await userClient.unbind(); } catch {}
            try { await client.unbind(); } catch {}
            return null;
          }
        }
        await client.unbind();
        return null;
      } catch (svcErr: any) {
        console.warn('[LDAP SERVICE BIND FAILED, FALLING BACK TO DIRECT BIND]:', svcErr?.message);
        try { await client.unbind(); } catch {}
      }
    }

    // Mode 2: Direct Single Bind with Constructed UPN (Safe: Exactly 1 single attempt, no lockout risk)
    const exactAccount = constructUserPrincipalName(username, searchBase, ldapUrl);
    console.log('[LDAP DIRECT BIND ATTEMPT]:', { username, exactAccount, ldapUrl });
    const directClient = new Client({ url: ldapUrl, timeout: 5000, connectTimeout: 5000 });
    await directClient.bind(exactAccount, password);

    let displayName = username;
    let email: string | undefined;

    if (searchBase) {
      try {
        const rawUser = username.includes('\\') ? username.split('\\')[1] : (username.includes('@') ? username.split('@')[0] : username);
        const { searchEntries } = await directClient.search(searchBase, {
          filter: `(|(sAMAccountName=${escapeLdapFilter(rawUser)})(uid=${escapeLdapFilter(rawUser)})(cn=${escapeLdapFilter(rawUser)})(userPrincipalName=${escapeLdapFilter(exactAccount)}))`,
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

    await directClient.unbind();

    return {
      ldapLogin: username,
      displayName,
      email,
    };
  } catch (error: any) {
    console.error('[LDAP AUTH ERROR]:', error?.message || error);
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

      // 2. Direct user binding test (Single attempt with constructUserPrincipalName, strictly NO loops)
      const exactAccount = constructUserPrincipalName(config.testLogin, config.searchBase, config.url);
      const userClient = new Client({ url: config.url, timeout: 5000 });
      try {
        await userClient.bind(exactAccount, config.testPassword);

        let displayName = config.testLogin;
        let email: string | undefined;

        if (config.searchBase) {
          try {
            const rawUser = config.testLogin.includes('\\')
              ? config.testLogin.split('\\')[1]
              : config.testLogin.includes('@')
              ? config.testLogin.split('@')[0]
              : config.testLogin;

            const { searchEntries } = await userClient.search(config.searchBase, {
              filter: `(|(sAMAccountName=${escapeLdapFilter(rawUser)})(uid=${escapeLdapFilter(rawUser)})(cn=${escapeLdapFilter(rawUser)})(userPrincipalName=${escapeLdapFilter(exactAccount)}))`,
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
          message: `Аутентификация в Active Directory успешна (${exactAccount})! Пользователь: «${displayName}»`,
          user: {
            ldapLogin: config.testLogin,
            displayName,
            email,
          },
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        try { await userClient.unbind(); } catch {}
        try { await client.unbind(); } catch {}
        return {
          success: false,
          error: `Ошибка авторизации в Active Directory (${exactAccount}): ${errorMsg}`,
        };
      }
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
