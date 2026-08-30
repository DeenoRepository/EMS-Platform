export interface LoginResult {
  success: boolean;
  error?: string;
}

export function getLoginValidationError(username: string, isOffline: boolean) {
  if (!username.trim()) return 'Пожалуйста, введите ваш корпоративный логин (LDAP / sAMAccountName)';
  if (isOffline) return 'База данных PostgreSQL недоступна. Запустите Docker и выполните: docker compose up -d postgres ldap';
  return null;
}

export function getLoginErrorMessage(result: LoginResult) {
  return result.error || 'Неверный логин или пароль';
}

export function getLoginExceptionMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Ошибка при отправке запроса авторизации';
}
