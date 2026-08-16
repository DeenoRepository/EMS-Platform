// ==========================================
// 1. КОДЫ И КАТАЛОГ ПРАВ (PERMISSIONS)
// ==========================================

export const PERMISSIONS = {
  // EPS
  EPS_EQUIPMENT_VIEW: 'eps.equipment.view',
  EPS_EQUIPMENT_CREATE: 'eps.equipment.create',
  EPS_EQUIPMENT_EDIT: 'eps.equipment.edit',
  EPS_EQUIPMENT_DELETE: 'eps.equipment.delete',
  EPS_DOCUMENTS_VIEW: 'eps.documents.view',
  EPS_DOCUMENTS_UPLOAD: 'eps.documents.upload',
  EPS_CUSTOM_FIELDS_MANAGE: 'eps.custom_fields.manage',
  EPS_APPROVALS_VIEW: 'eps.approvals.view',
  EPS_APPROVALS_CREATE: 'eps.approvals.create',
  EPS_APPROVALS_MANAGE: 'eps.approvals.manage',
  EPS_HISTORY_VIEW: 'eps.history.view',

  // WMS
  WMS_STOCK_VIEW: 'wms.stock.view',
  WMS_OPERATIONS_CREATE: 'wms.operations.create',
  WMS_NOMENCLATURE_MANAGE: 'wms.nomenclature.manage',
  WMS_INVENTORY_MANAGE: 'wms.inventory.manage',

  // SRM
  SRM_DASHBOARD_VIEW: 'srm.dashboard.view',
  SRM_REPORTS_EXPORT: 'srm.reports.export',

  // MRO
  MRO_SCHEDULE_VIEW: 'mro.schedule.view',
  MRO_SCHEDULE_MANAGE: 'mro.schedule.manage',
  MRO_EXECUTION_COMPLETE: 'mro.execution.complete',

  // ADMIN
  ADMIN_USERS_MANAGE: 'admin.users.manage',
  ADMIN_ROLES_MANAGE: 'admin.roles.manage',
  ADMIN_AUDIT_VIEW: 'admin.audit.view',
  ADMIN_SETTINGS_MANAGE: 'admin.settings.manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ==========================================
// 2. СТАТУСЫ И МЕТКИ (RUSSIAN LABELS & COLORS)
// ==========================================

export const EQUIPMENT_STATUS_MAP: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
  ACTIVE: { label: 'В работе', color: 'success' },
  UNDER_REPAIR: { label: 'На ремонте', color: 'warning' },
  DECOMMISSIONED: { label: 'Списано', color: 'error' },
  IN_STORAGE: { label: 'На складе', color: 'default' },
};

export const DOCUMENT_TYPE_MAP: Record<string, string> = {
  SCHEMA: 'Схема / Чертёж',
  MANUAL: 'Инструкция по эксплуатации',
  CERTIFICATE: 'Сертификат / Паспорт изделия',
  PASSPORT: 'Формуляр / Паспорт',
  ACT: 'Акт ввода / испытаний',
  OTHER: 'Прочий документ',
};

export const APPROVAL_TYPE_MAP: Record<string, string> = {
  COMMISSIONING: 'Ввод в эксплуатацию',
  DECOMMISSIONING: 'Списание оборудования',
  STATUS_CHANGE: 'Смена рабочего статуса',
  PARAMETER_CHANGE: 'Изменение характеристик',
  DOCUMENT_APPROVAL: 'Согласование документации',
};

export const APPROVAL_STATUS_MAP: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'default' | 'info' }> = {
  PENDING: { label: 'На рассмотрении', color: 'warning' },
  APPROVED: { label: 'Согласовано', color: 'success' },
  REJECTED: { label: 'Отклонено', color: 'error' },
  CANCELLED: { label: 'Отозвано', color: 'default' },
};

export const OPERATION_TYPE_MAP: Record<string, { label: string; color: 'success' | 'warning' | 'info' | 'default' }> = {
  RECEIPT: { label: 'Приход', color: 'success' },
  ISSUE: { label: 'Расход / Списание', color: 'warning' },
  TRANSFER: { label: 'Перемещение', color: 'info' },
  ADJUSTMENT: { label: 'Корректировка', color: 'default' },
};

export const MAINTENANCE_STATUS_MAP: Record<string, { label: string; color: 'info' | 'warning' | 'success' | 'error' | 'default' }> = {
  PLANNED: { label: 'Запланировано', color: 'info' },
  IN_PROGRESS: { label: 'В работе', color: 'warning' },
  COMPLETED: { label: 'Выполнено', color: 'success' },
  MISSED: { label: 'Просрочено', color: 'error' },
  CANCELLED: { label: 'Отменено', color: 'default' },
};

export const MAINTENANCE_FREQUENCY_MAP: Record<string, string> = {
  DAILY: 'Ежедневно',
  WEEKLY: 'Еженедельно',
  MONTHLY: 'Ежемесячно',
  QUARTERLY: 'Ежеквартально',
  YEARLY: 'Ежегодно',
  CUSTOM: 'По интервалу дней',
};

export const AUDIT_ACTION_MAP: Record<string, { label: string; color: 'success' | 'info' | 'error' | 'warning' | 'default' }> = {
  CREATE: { label: 'Создание', color: 'success' },
  UPDATE: { label: 'Изменение', color: 'info' },
  DELETE: { label: 'Удаление', color: 'error' },
  LOGIN: { label: 'Вход в систему', color: 'default' },
  LOGOUT: { label: 'Выход из системы', color: 'default' },
};

// ==========================================
// 3. JWT СЕССИЯ И ТИПЫ ПОЛЬЗОВАТЕЛЕЙ
// ==========================================

export interface JwtUserPayload {
  userId: string;
  ldapLogin: string;
  displayName: string;
  email?: string | null;
  roles: string[];
  permissions: string[];
}

// ==========================================
// 4. ТИПЫ API ОТВЕТОВ
// ==========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==========================================
// 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ФОРМАТИРОВАНИЯ
// ==========================================

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Байт';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Байт', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
