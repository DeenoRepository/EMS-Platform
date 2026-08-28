import { Client } from 'ldapts';

export interface LdapUserResult {
  ldapLogin: string;
  displayName: string;
  email?: string;
}

export interface LdapAuthConfig {
  ldapUrl?: string;
  searchBase?: string;
  ldapEnabled?: boolean;
}

export interface LdapTestConfig {
  url: string;
  bindDn?: string;
  bindPassword?: string;
  searchBase?: string;
  searchFilter?: string;
  testLogin?: string;
  testPassword?: string;
}

export interface LdapTestResult {
  success: boolean;
  message?: string;
  error?: string;
  user?: LdapUserResult;
}

export interface LdapEntryLike {
  dn?: string;
  displayName?: unknown;
  cn?: unknown;
  sAMAccountName?: unknown;
  mail?: unknown;
  [key: string]: unknown;
}

/**
 * Escapes characters in LDAP filter strings to prevent LDAP injection attacks
 * RFC 4515: \ * ( ) NUL /
 */
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

/**
 * Constructs user principal name or NetBIOS account name for direct bind
 */
export function constructUserPrincipalName(username: string, searchBase?: string, ldapUrl?: string): string {
  const cleanUser = username.trim();
  if (!cleanUser) return '';

  if (cleanUser.includes('@') || cleanUser.includes('\\')) {
    return cleanUser;
  }

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

/**
 * Creates an LDAP client instance with configured timeouts
 */
export function createLdapClient(url: string, timeout = 5000): Client {
  return new Client({
    url,
    timeout,
    connectTimeout: timeout,
  });
}

/**
 * Safely unbinds an LDAP client without throwing
 */
export async function safeUnbind(client?: Client | null): Promise<void> {
  if (!client) return;
  try {
    await client.unbind();
  } catch {}
}

/**
 * Extracts display name and email from an LDAP search entry
 */
function extractUserFromEntry(entry: LdapEntryLike, fallbackLogin: string): LdapUserResult {
  const displayName = entry.displayName || entry.cn || entry.sAMAccountName || fallbackLogin;
  const email = entry.mail ? String(entry.mail) : undefined;
  return {
    ldapLogin: fallbackLogin,
    displayName: String(displayName),
    email,
  };
}

/**
 * Authenticates user via Service Account Search & User Bind
 */
async function authenticateViaServiceAccount(
  ldapUrl: string,
  bindDn: string,
  bindPassword: string,
  searchBase: string,
  filterTemplate: string,
  username: string,
  password: string
): Promise<LdapUserResult | null> {
  const client = createLdapClient(ldapUrl);
  try {
    await client.bind(bindDn, bindPassword);

    const sanitizedUsername = escapeLdapFilter(username);
    const filter = filterTemplate.replace(/\{\{username\}\}/g, sanitizedUsername);
    const { searchEntries } = await client.search(searchBase, {
      filter,
      scope: 'sub',
      attributes: ['dn', 'displayName', 'cn', 'mail', 'sAMAccountName', 'userPrincipalName'],
    });

    if (searchEntries.length === 0 || !searchEntries[0]?.dn) {
      await safeUnbind(client);
      return null;
    }

    const userEntry = searchEntries[0] as unknown as LdapEntryLike;
    const userClient = createLdapClient(ldapUrl);
    try {
      await userClient.bind(String(userEntry.dn), password);
      await safeUnbind(userClient);
      await safeUnbind(client);
      return extractUserFromEntry(userEntry, username);
    } catch {
      await safeUnbind(userClient);
      await safeUnbind(client);
      return null;
    }
  } catch {
    await safeUnbind(client);
    return null;
  }
}

/**
 * Authenticates user via Direct UPN Bind
 */
async function authenticateViaDirectBind(
  ldapUrl: string,
  exactAccount: string,
  username: string,
  password: string,
  searchBase?: string
): Promise<LdapUserResult | null> {
  const directClient = createLdapClient(ldapUrl);
  try {
    await directClient.bind(exactAccount, password);

    let displayName = username;
    let email: string | undefined;

    if (searchBase) {
      try {
        const rawUser = username.includes('\\')
          ? username.split('\\')[1]
          : username.includes('@')
          ? username.split('@')[0]
          : username;
        const { searchEntries } = await directClient.search(searchBase, {
          filter: `(|(sAMAccountName=${escapeLdapFilter(rawUser)})(uid=${escapeLdapFilter(rawUser)})(cn=${escapeLdapFilter(rawUser)})(userPrincipalName=${escapeLdapFilter(exactAccount)}))`,
          scope: 'sub',
          attributes: ['displayName', 'cn', 'mail'],
        });
        if (searchEntries.length > 0) {
          const entry = searchEntries[0] as unknown as LdapEntryLike;
          if (entry.displayName || entry.cn) displayName = String(entry.displayName || entry.cn);
          if (entry.mail) email = String(entry.mail);
        }
      } catch {}
    }

    await safeUnbind(directClient);
    return {
      ldapLogin: username,
      displayName,
      email,
    };
  } catch {
    await safeUnbind(directClient);
    return null;
  }
}

/**
 * Main LDAP authentication entry point
 */
export async function authenticateLdap(
  username: string,
  password: string,
  configOverride?: LdapAuthConfig
): Promise<LdapUserResult | null> {
  const ldapEnabled = configOverride?.ldapEnabled !== undefined
    ? configOverride.ldapEnabled
    : (typeof process !== 'undefined' ? process.env?.LDAP_ENABLED === 'true' : false);
  const ldapUrl = configOverride?.ldapUrl || (typeof process !== 'undefined' ? process.env?.LDAP_URL : undefined);
  const bindDn = typeof process !== 'undefined' ? process.env?.LDAP_BIND_DN : undefined;
  const bindPassword = typeof process !== 'undefined' ? process.env?.LDAP_BIND_PASSWORD : undefined;
  const searchBase = configOverride?.searchBase || (typeof process !== 'undefined' ? process.env?.LDAP_SEARCH_BASE : '') || '';
  const filterTemplate = (typeof process !== 'undefined' ? process.env?.LDAP_SEARCH_FILTER : undefined) || '(|(sAMAccountName={{username}})(uid={{username}})(userPrincipalName={{username}}))';

  if (!ldapEnabled || !ldapUrl || !username || !password) {
    return null;
  }

  const hasServiceAccount = Boolean(bindDn && bindDn.trim() && bindPassword && bindPassword.trim());

  if (hasServiceAccount && searchBase) {
    const serviceResult = await authenticateViaServiceAccount(
      ldapUrl,
      bindDn!,
      bindPassword!,
      searchBase,
      filterTemplate,
      username,
      password
    );
    if (serviceResult) return serviceResult;
  }

  const exactAccount = constructUserPrincipalName(username, searchBase, ldapUrl);
  return authenticateViaDirectBind(ldapUrl, exactAccount, username, password, searchBase);
}

/**
 * Tests LDAP connectivity, bind account credentials, or specific user authentication
 */
export async function testLdapConnection(config: LdapTestConfig): Promise<LdapTestResult> {
  let client: Client;
  try {
    client = createLdapClient(config.url);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Некорректный URL: ${errorMsg}` };
  }

  try {
    if (config.testLogin && config.testPassword) {
      if (config.bindDn && config.bindPassword) {
        try {
          await client.bind(config.bindDn, config.bindPassword);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          await safeUnbind(client);
          return { success: false, error: `Ошибка авторизации служебного аккаунта (Bind DN): ${errorMsg}` };
        }

        if (!config.searchBase) {
          await safeUnbind(client);
          return { success: false, error: 'Для поиска пользователя необходимо указать Search Base' };
        }

        const filterTemplate = config.searchFilter || '(|(sAMAccountName={{username}})(uid={{username}})(userPrincipalName={{username}})(cn={{username}}))';
        const filter = filterTemplate.replace(/\{\{username\}\}/g, escapeLdapFilter(config.testLogin));

        let userEntry: LdapEntryLike | null = null;
        try {
          const { searchEntries } = await client.search(config.searchBase, {
            scope: 'sub',
            filter,
            attributes: ['dn', 'displayName', 'cn', 'mail', 'sAMAccountName'],
          });
          if (searchEntries.length > 0) {
            userEntry = searchEntries[0] as unknown as LdapEntryLike;
          }
        } catch (searchErr: unknown) {
          const errorMsg = searchErr instanceof Error ? searchErr.message : String(searchErr);
          await safeUnbind(client);
          return { success: false, error: `Ошибка поиска пользователя в Search Base: ${errorMsg}` };
        }

        if (!userEntry || !userEntry.dn) {
          await safeUnbind(client);
          return {
            success: false,
            error: `Пользователь с логином «${config.testLogin}» не найден в каталоге LDAP (${config.searchBase})`,
          };
        }

        const userClient = createLdapClient(config.url);
        try {
          await userClient.bind(String(userEntry.dn), config.testPassword);
          await safeUnbind(userClient);
          await safeUnbind(client);
          const user = extractUserFromEntry(userEntry, config.testLogin);
          return {
            success: true,
            message: `Аутентификация администратора в LDAP успешна! Пользователь: «${user.displayName}» (DN: ${userEntry.dn})`,
            user,
          };
        } catch {
          await safeUnbind(userClient);
          await safeUnbind(client);
          return {
            success: false,
            error: `Пользователь найден («${userEntry.displayName || userEntry.cn || config.testLogin}»), но пароль не подошел. Проверьте пароль в LDAP.`,
          };
        }
      }

      const exactAccount = constructUserPrincipalName(config.testLogin, config.searchBase, config.url);
      const userClient = createLdapClient(config.url);
      try {
        await userClient.bind(exactAccount, config.testPassword);
        await safeUnbind(userClient);
        await safeUnbind(client);
        return {
          success: true,
          message: `Аутентификация в Active Directory успешна (${exactAccount})!`,
          user: {
            ldapLogin: config.testLogin,
            displayName: config.testLogin,
          },
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await safeUnbind(userClient);
        await safeUnbind(client);
        return {
          success: false,
          error: `Ошибка авторизации в Active Directory (${exactAccount}): ${errorMsg}`,
        };
      }
    }

    if (config.bindDn && config.bindPassword) {
      try {
        await client.bind(config.bindDn, config.bindPassword);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await safeUnbind(client);
        return { success: false, error: `Ошибка аутентификации Bind DN: ${errorMsg}` };
      }

      if (config.searchBase) {
        try {
          await client.search(config.searchBase, {
            scope: 'base',
            filter: '(objectClass=*)',
            sizeLimit: 1,
            timeLimit: 5,
          });
          await safeUnbind(client);
          return { success: true, message: 'Связь с Active Directory / LDAP подтверждена!' };
        } catch (searchErr: unknown) {
          const errorMsg = searchErr instanceof Error ? searchErr.message : String(searchErr);
          await safeUnbind(client);
          return { success: false, error: `Search Base недоступен (или ошибка поиска): ${errorMsg}` };
        }
      } else {
        await safeUnbind(client);
        return { success: true, message: 'Успешная авторизация Bind DN в LDAP!' };
      }
    }

    try {
      await client.search('', { scope: 'base', filter: '(objectClass=*)', sizeLimit: 1, timeLimit: 5 });
    } catch {
      await safeUnbind(client);
      return { success: true, message: 'LDAP-сервер ответил на сетевой запрос (без авторизации)' };
    }
    await safeUnbind(client);
    return { success: true, message: 'LDAP-сервер доступен' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await safeUnbind(client);
    return { success: false, error: `Ошибка связи с LDAP: ${errorMsg}` };
  }
}
