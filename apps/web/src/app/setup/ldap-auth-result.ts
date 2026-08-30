export interface LdapAuthUser {
  displayName?: string;
  email?: string;
}

export interface LdapAuthResponse {
  success?: boolean;
  message?: string;
  error?: string;
  user?: LdapAuthUser | null;
}

export interface LdapAuthProfileDefaults {
  adminDisplayName: string;
  adminEmail: string;
}

export interface LdapAuthOutcome {
  result: {
    success: boolean;
    message: string;
  };
  ldapAuthVerified: boolean;
  adminDisplayName?: string;
  adminEmail?: string;
}

const DEFAULT_ADMIN_DISPLAY_NAME = 'Главный Администратор';
const DEFAULT_ADMIN_EMAIL = 'admin@company.local';

export function mapLdapAuthResponse(
  responseOk: boolean,
  response: LdapAuthResponse,
  profile: LdapAuthProfileDefaults
): LdapAuthOutcome {
  if (!responseOk || !response.success) {
    return {
      result: {
        success: false,
        message: response.error || 'Ошибка аутентификации в каталоге LDAP',
      },
      ldapAuthVerified: false,
    };
  }

  const outcome: LdapAuthOutcome = {
    result: {
      success: true,
      message: response.message || '',
    },
    ldapAuthVerified: true,
  };

  if (response.user?.displayName && (!profile.adminDisplayName || profile.adminDisplayName === DEFAULT_ADMIN_DISPLAY_NAME)) {
    outcome.adminDisplayName = response.user.displayName;
  }
  if (response.user?.email && (!profile.adminEmail || profile.adminEmail === DEFAULT_ADMIN_EMAIL)) {
    outcome.adminEmail = response.user.email;
  }

  return outcome;
}

export function mapLdapAuthNetworkError(): LdapAuthOutcome {
  return {
    result: { success: false, message: 'Ошибка сети при проверке службы LDAP' },
    ldapAuthVerified: false,
  };
}
