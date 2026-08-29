export interface SetupPayloadInput {
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  adminLogin: string;
  adminDisplayName: string;
  adminEmail: string;
  adminPassword: string;
  authMode: 'local' | 'ldap';
  ldapEnabled: boolean;
  ldapUrl: string;
  ldapBindDn: string;
  ldapBindPassword: string;
  ldapSearchBase: string;
  ldapSearchFilter: string;
  storageDir: string;
  srmUrl: string;
  srmProjectKey: string;
  srmApiKey: string;
}

export function buildSetupPayload(input: SetupPayloadInput) {
  return {
    dbConfig: {
      host: input.dbHost,
      port: input.dbPort,
      database: input.dbName,
      user: input.dbUser,
      password: input.dbPassword,
    },
    adminConfig: {
      login: input.adminLogin,
      displayName: input.adminDisplayName,
      email: input.adminEmail,
      password: input.authMode === 'ldap' ? '' : input.adminPassword,
      authType: input.authMode,
    },
    ldapConfig: {
      enabled: input.authMode === 'ldap' || input.ldapEnabled,
      authType: input.authMode,
      useForAdmin: input.authMode === 'ldap',
      url: input.ldapUrl,
      bindDn: input.ldapBindDn,
      bindPassword: input.ldapBindPassword,
      searchBase: input.ldapSearchBase,
      searchFilter: input.ldapSearchFilter,
    },
    storageConfig: {
      dir: input.storageDir,
    },
    jiraConfig: {
      host: input.srmUrl,
      email: '',
      apiToken: input.srmApiKey,
      projectKey: input.srmProjectKey,
    },
  };
}
