import ldap from 'ldapjs';

export interface LdapUserResult {
  ldapLogin: string;
  displayName: string;
  email?: string;
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
      const filter = filterTemplate.replace('{{username}}', username);
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
