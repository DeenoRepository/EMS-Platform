import ldap from 'ldapjs';

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

  return new Promise((resolve) => {
    let client: ldap.Client | null = null;
    try {
      client = ldap.createClient({ url: ldapUrl, timeout: 5000, connectTimeout: 5000 });
    } catch {
      return resolve(null);
    }

    client.on('error', () => {
      resolve(null);
    });

    const initialBind = () => {
      if (bindDn && bindPassword) {
        client!.bind(bindDn, bindPassword, (err) => {
          if (err) {
            client?.unbind(() => {});
            return resolve(null);
          }
          searchUser();
        });
      } else {
        searchUser();
      }
    };

    const searchUser = () => {
      const sanitizedUsername = escapeLdapFilter(username);
      const filter = filterTemplate.replace('{{username}}', sanitizedUsername);
      const searchOptions: ldap.SearchOptions = {
        filter,
        scope: 'sub',
        attributes: ['dn', 'displayName', 'cn', 'mail', 'sAMAccountName', 'userPrincipalName'],
      };

      client!.search(searchBase, searchOptions, (err, res) => {
        if (err) {
          client?.unbind(() => {});
          return resolve(null);
        }

        let userEntry: any = null;

        res.on('searchEntry', (entry: any) => {
          userEntry = entry.object || entry.pojo || entry;
        });

        res.on('error', () => {
          client?.unbind(() => {});
          return resolve(null);
        });

        res.on('end', () => {
          if (!userEntry || !userEntry.dn) {
            client?.unbind(() => {});
            return resolve(null);
          }

          // Попытка bind от имени пользователя
          const userClient = ldap.createClient({ url: ldapUrl, timeout: 5000 });
          userClient.bind(userEntry.dn, password, (bindErr) => {
            userClient.unbind(() => {});
            client?.unbind(() => {});

            if (bindErr) {
              return resolve(null);
            }

            const displayName =
              userEntry.displayName ||
              userEntry.cn ||
              userEntry.sAMAccountName ||
              username;
            const email = userEntry.mail || undefined;

            resolve({
              ldapLogin: username,
              displayName: String(displayName),
              email: email ? String(email) : undefined,
            });
          });
        });
      });
    };

    initialBind();
  });
}

export async function testLdapConnection(config: {
  url: string;
  bindDn?: string;
  bindPassword?: string;
  searchBase?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  return new Promise((resolve) => {
    let client: ldap.Client;
    try {
      client = ldap.createClient({
        url: config.url,
        timeout: 5000,
        connectTimeout: 5000,
      });
    } catch (err: any) {
      return resolve({ success: false, error: `Некорректный URL: ${err.message}` });
    }

    client.on('error', (err: any) => {
      resolve({ success: false, error: `Ошибка связи с LDAP: ${err.message}` });
    });

    if (config.bindDn && config.bindPassword) {
      client.bind(config.bindDn, config.bindPassword, (err) => {
        if (err) {
          client.unbind(() => {});
          return resolve({
            success: false,
            error: `Ошибка аутентификации Bind DN: ${err.message}`,
          });
        }

        if (config.searchBase) {
          client.search(
            config.searchBase,
            {
              scope: 'base',
              filter: '(objectClass=*)',
              timeLimit: 5,
            },
            (searchErr, res) => {
              if (searchErr) {
                client.unbind(() => {});
                return resolve({
                  success: false,
                  error: `Search Base недоступен: ${searchErr.message}`,
                });
              }
              res.on('end', () => {
                client.unbind(() => {});
                resolve({ success: true, message: 'Связь с Active Directory / LDAP подтверждена!' });
              });
              res.on('error', (resErr) => {
                client.unbind(() => {});
                resolve({ success: false, error: `Ошибка поиска: ${resErr.message}` });
              });
            }
          );
        } else {
          client.unbind(() => {});
          resolve({ success: true, message: 'Успешная авторизация Bind DN в LDAP!' });
        }
      });
    } else {
      client.search('', { scope: 'base', filter: '(objectClass=*)' }, (err) => {
        client.unbind(() => {});
        if (err) {
          return resolve({ success: true, message: 'LDAP-сервер ответил на сетевой запрос' });
        }
        resolve({ success: true, message: 'LDAP-сервер доступен' });
      });
    }
  });
}

