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
  EPS_REPORTS_VIEW: 'eps.reports.view',
  EPS_REPORTS_MANAGE: 'eps.reports.manage',
  EPS_IMPORT_EXECUTE: 'eps.import.execute',

  // WMS
  WMS_STOCK_VIEW: 'wms.stock.view',
  WMS_OPERATIONS_CREATE: 'wms.operations.create',
  WMS_NOMENCLATURE_MANAGE: 'wms.nomenclature.manage',
  WMS_WAREHOUSES_MANAGE: 'wms.warehouses.manage',
  WMS_ZONES_MANAGE: 'wms.zones.manage',
  WMS_INVENTORY_MANAGE: 'wms.inventory.manage',

  // SRM
  SRM_DASHBOARD_VIEW: 'srm.dashboard.view',
  SRM_REQUESTS_CREATE: 'srm.requests.create',
  SRM_REQUESTS_MANAGE: 'srm.requests.manage',
  SRM_RELIABILITY_VIEW: 'srm.reliability.view',
  SRM_WARRANTY_MANAGE: 'srm.warranty.manage',
  SRM_SYNC_TRIGGER: 'srm.sync.trigger',
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

export interface PermissionDefinition {
  code: PermissionCode;
  displayName: string;
  module: 'eps' | 'wms' | 'srm' | 'mro' | 'admin';
  description: string;
}

export const PERMISSION_DEFINITIONS: Record<PermissionCode, PermissionDefinition> = {
  // ADMIN
  'admin.users.manage': {
    code: 'admin.users.manage',
    displayName: 'Управление пользователями',
    module: 'admin',
    description: 'Создание, редактирование, блокировка учетных записей и назначение ролей сотрудникам',
  },
  'admin.roles.manage': {
    code: 'admin.roles.manage',
    displayName: 'Управление ролями и матрицей прав',
    module: 'admin',
    description: 'Создание ролей, редактирование состава гранулярных прав и распределение привилегий',
  },
  'admin.audit.view': {
    code: 'admin.audit.view',
    displayName: 'Журнал аудита действий',
    module: 'admin',
    description: 'Просмотр системного протокола изменений, авторизаций и критических операций пользователей',
  },
  'admin.settings.manage': {
    code: 'admin.settings.manage',
    displayName: 'Конфигурация системы и интеграций',
    module: 'admin',
    description: 'Настройка параметров платформы, LDAP/Active Directory, Jira и системных политик',
  },

  // EPS
  'eps.equipment.view': {
    code: 'eps.equipment.view',
    displayName: 'Просмотр реестра и паспортов',
    module: 'eps',
    description: 'Доступ к реестру станков и агрегатов, просмотр технических характеристик и статусов',
  },
  'eps.equipment.create': {
    code: 'eps.equipment.create',
    displayName: 'Регистрация нового оборудования',
    module: 'eps',
    description: 'Создание паспортов единиц оборудования через мастер пошаговой регистрации',
  },
  'eps.equipment.edit': {
    code: 'eps.equipment.edit',
    displayName: 'Редактирование характеристик',
    module: 'eps',
    description: 'Внесение изменений в технические параметры, реквизиты и привязку оборудования',
  },
  'eps.equipment.delete': {
    code: 'eps.equipment.delete',
    displayName: 'Удаление оборудования',
    module: 'eps',
    description: 'Безвозвратное удаление карточек оборудования из реестра (требует повышенных прав)',
  },
  'eps.documents.view': {
    code: 'eps.documents.view',
    displayName: 'Просмотр технической документации',
    module: 'eps',
    description: 'Просмотр и скачивание чертежей, схем, паспортов и руководств по эксплуатации',
  },
  'eps.documents.upload': {
    code: 'eps.documents.upload',
    displayName: 'Загрузка и прикрепление документов',
    module: 'eps',
    description: 'Добавление файлов, технических актов, схем и чертежей к паспортам оборудования',
  },
  'eps.custom_fields.manage': {
    code: 'eps.custom_fields.manage',
    displayName: 'Конструктор разделов и характеристик',
    module: 'eps',
    description: 'Настройка динамических технических разделов и кастомных параметров паспорта',
  },
  'eps.approvals.view': {
    code: 'eps.approvals.view',
    displayName: 'Просмотр заявок на согласование',
    module: 'eps',
    description: 'Просмотр списка запросов на ввод в эксплуатацию, списание и изменение статусов',
  },
  'eps.approvals.create': {
    code: 'eps.approvals.create',
    displayName: 'Подача заявок на согласование',
    module: 'eps',
    description: 'Формирование и отправка запросов на изменение жизненного цикла оборудования',
  },
  'eps.approvals.manage': {
    code: 'eps.approvals.manage',
    displayName: 'Утверждение и отклонение заявок',
    module: 'eps',
    description: 'Рассмотрение, согласование или отклонение заявок с фиксацией резолюции',
  },
  'eps.history.view': {
    code: 'eps.history.view',
    displayName: 'История изменений паспортов',
    module: 'eps',
    description: 'Просмотр хронологического журнала изменений параметров и статусов оборудования',
  },
  'eps.reports.view': {
    code: 'eps.reports.view',
    displayName: 'Формирование и просмотр отчетов',
    module: 'eps',
    description: 'Доступ к интерактивному конструктору отчетов и выгрузка ведомостей (Excel, CSV, JSON)',
  },
  'eps.reports.manage': {
    code: 'eps.reports.manage',
    displayName: 'Управление шаблонами отчетов',
    module: 'eps',
    description: 'Создание, сохранение и редактирование типовых отраслевых шаблонов ведомостей',
  },
  'eps.import.execute': {
    code: 'eps.import.execute',
    displayName: 'Пакетный импорт данных',
    module: 'eps',
    description: 'Загрузка и валидация реестров оборудования из внешних файлов Excel через мастер импорта',
  },

  // WMS
  'wms.stock.view': {
    code: 'wms.stock.view',
    displayName: 'Просмотр складских остатков',
    module: 'wms',
    description: 'Просмотр наличия материалов, запчастей, фильтрация по складам и отслеживание дефицита',
  },
  'wms.operations.create': {
    code: 'wms.operations.create',
    displayName: 'Проведение складских операций',
    module: 'wms',
    description: 'Оформление приходов, расходов, списаний в утиль и внутренних перемещений ТМЦ',
  },
  'wms.nomenclature.manage': {
    code: 'wms.nomenclature.manage',
    displayName: 'Управление номенклатурным справочником',
    module: 'wms',
    description: 'Добавление и редактирование карточек номенклатуры, артикулов, категорий и норм остатка',
  },
  'wms.warehouses.manage': {
    code: 'wms.warehouses.manage',
    displayName: 'Управление складами',
    module: 'wms',
    description: 'Создание складов, редактирование реквизитов и назначение материально ответственных лиц',
  },
  'wms.zones.manage': {
    code: 'wms.zones.manage',
    displayName: 'Конфигурация зон и ячеек хранения',
    module: 'wms',
    description: 'Настройка топологии склада: создание зон, стеллажей, ярусов и ячеек адресного хранения',
  },
  'wms.inventory.manage': {
    code: 'wms.inventory.manage',
    displayName: 'Проведение инвентаризации',
    module: 'wms',
    description: 'Создание инвентаризационных описей, фиксация фактических остатков и закрытие актов',
  },

  // SRM
  'srm.dashboard.view': {
    code: 'srm.dashboard.view',
    displayName: 'Просмотр инцидентов и сервисных заявок',
    module: 'srm',
    description: 'Доступ к дашборду надежности, списку поломок, инцидентов и метрикам MTTR / MTBF',
  },
  'srm.requests.create': {
    code: 'srm.requests.create',
    displayName: 'Подача сервисных заявок и инцидентов',
    module: 'srm',
    description: 'Создание внутренних заявок на неисправность и ремонт оборудования',
  },
  'srm.requests.manage': {
    code: 'srm.requests.manage',
    displayName: 'Управление инцидентами и нарядами',
    module: 'srm',
    description: 'Назначение исполнителей, сброс статусов, передача в MRO и закрытие инцидентов',
  },
  'srm.reliability.view': {
    code: 'srm.reliability.view',
    displayName: 'Аналитика надежности RAMS & RCM',
    module: 'srm',
    description: 'Доступ к расчетам MTTR, MTBF, КТГ, анализу Парето и причинам простоев',
  },
  'srm.warranty.manage': {
    code: 'srm.warranty.manage',
    displayName: 'Управление гарантиями и рекламациями',
    module: 'srm',
    description: 'Ведение гарантийных случаев, сервисных договоров и рекламационных актов',
  },
  'srm.sync.trigger': {
    code: 'srm.sync.trigger',
    displayName: 'Синхронизация с Helpdesk / Jira',
    module: 'srm',
    description: 'Ручной и автоматический запуск синхронизации заявок и аварийных заявок с внешними системами',
  },
  'srm.reports.export': {
    code: 'srm.reports.export',
    displayName: 'Экспорт аналитических отчетов SRM',
    module: 'srm',
    description: 'Выгрузка журналов простоев, поломок и сводных метрик в Excel и PDF',
  },

  // MRO
  'mro.schedule.view': {
    code: 'mro.schedule.view',
    displayName: 'Просмотр графика ППР и чек-листов',
    module: 'mro',
    description: 'Доступ к календарному плану техобслуживания, графикам ППР и чек-листам регламентных работ',
  },
  'mro.schedule.manage': {
    code: 'mro.schedule.manage',
    displayName: 'Планирование графиков ТО',
    module: 'mro',
    description: 'Создание планов технического обслуживания, назначение периодичности и ответственных бригад',
  },
  'mro.execution.complete': {
    code: 'mro.execution.complete',
    displayName: 'Фиксация выполнения ТО',
    module: 'mro',
    description: 'Отметка выполнения пунктов чек-листа, списание израсходованных запчастей и закрытие нарядов',
  },
};

// ==========================================
// 2. СТАТУСЫ И МЕТКИ (RUSSIAN LABELS & COLORS)
// ==========================================

export const EQUIPMENT_STATUS_MAP: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
  ACTIVE: { label: 'В работе', color: 'success' },
  UNDER_REPAIR: { label: 'На ремонте', color: 'warning' },
  DECOMMISSIONED: { label: 'Списано', color: 'error' },
  IN_STORAGE: { label: 'На складе', color: 'default' },
  INACTIVE: { label: 'Неактивно', color: 'default' },
  DRAFT: { label: 'Черновик', color: 'default' },
};

export const DOCUMENT_TYPE_MAP: Record<string, string> = {
  SCHEMA: 'Принципиальная / Монтажная схема, Чертёж (ЕСКД)',
  MANUAL: 'Руководство по эксплуатации и ТО (РЭ)',
  CERTIFICATE: 'Сертификат соответствия / Декларация ТР ТС',
  PASSPORT: 'Формуляр / Паспорт изделия (ПС)',
  ACT: 'Акт ввода в эксплуатацию / Акт испытаний',
  OTHER: 'Прочая техническая документация',
};

export const APPROVAL_TYPE_MAP: Record<string, string> = {
  EQUIPMENT_CREATE: 'Создание карточки оборудования',
  EQUIPMENT_UPDATE: 'Изменение технических характеристик',
  EQUIPMENT_DELETE: 'Удаление единицы оборудования',
  DOCUMENT_CREATE: 'Прикрепление технической документации',
  DOCUMENT_DELETE: 'Аннулирование / Удаление документа',
  COMMISSIONING: 'Ввод в промышленную эксплуатацию',
  DECOMMISSIONING: 'Вывод из эксплуатации и списание',
  STATUS_CHANGE: 'Изменение эксплуатационного статуса',
  PARAMETER_CHANGE: 'Корректировка паспорта оборудования',
  DOCUMENT_APPROVAL: 'Утверждение нормативно-технической документации',
};

export const APPROVAL_STATUS_MAP: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'default' | 'info' }> = {
  PENDING: { label: 'На рассмотрении', color: 'warning' },
  APPROVED: { label: 'Согласовано', color: 'success' },
  REJECTED: { label: 'Отклонено', color: 'error' },
  CANCELLED: { label: 'Отозвано', color: 'default' },
};

export const OPERATION_TYPE_MAP: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  RECEIPT: { label: 'Приход', color: 'success' },
  ISSUE: { label: 'Расход / Списание', color: 'warning' },
  ISSUE_EMPLOYEE: { label: 'Выдача сотруднику', color: 'warning' },
  ISSUE_WRITE_OFF: { label: 'Списание в утиль', color: 'error' },
  TRANSFER: { label: 'Перемещение', color: 'info' },
  ADJUSTMENT: { label: 'Корректировка', color: 'default' },
};

export const STOCK_TRANSFER_STATUS_MAP: Record<string, { label: string; color: 'warning' | 'info' | 'success' | 'error' | 'default' }> = {
  REQUESTED: { label: 'Запрошено (Ожидает отгрузки)', color: 'warning' },
  IN_TRANSIT: { label: 'В пути (Ожидает приемки)', color: 'info' },
  COMPLETED: { label: 'Принято', color: 'success' },
  REJECTED: { label: 'Отклонено', color: 'error' },
  CANCELLED: { label: 'Отозвано', color: 'default' },
};

export const INVENTORY_STATUS_MAP: Record<string, { label: string; color: 'warning' | 'info' | 'success' | 'default' }> = {
  DRAFT: { label: 'Черновик', color: 'default' },
  IN_PROGRESS: { label: 'В процессе', color: 'warning' },
  COMPLETED: { label: 'Завершена', color: 'success' },
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

export const SRM_STATUS_MAP: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'success' | 'default' }> = {
  OPEN: { label: 'Новая / Открыта', color: 'error' },
  IN_PROGRESS: { label: 'В работе', color: 'warning' },
  WAITING: { label: 'Ожидание запчастей / Подрядчика', color: 'info' },
  RESOLVED: { label: 'Устранена / Решена', color: 'success' },
  CLOSED: { label: 'Закрыта', color: 'default' },
};

export const SRM_PRIORITY_MAP: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'default' }> = {
  CRITICAL: { label: 'Аварийный / Критический', color: 'error' },
  HIGH: { label: 'Высокий', color: 'error' },
  MEDIUM: { label: 'Средний', color: 'warning' },
  LOW: { label: 'Низкий', color: 'info' },
};

export const SRM_FAILURE_CATEGORY_MAP: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'default' | 'success' }> = {
  MECHANICAL: { label: 'Механический отказ / Износ узлов и кинематики', color: 'error' },
  ELECTRICAL: { label: 'Электрооборудование / Привод / Цепи питания', color: 'warning' },
  HYDRAULIC: { label: 'Гидравлика / Пневматика / Нарушение давления', color: 'info' },
  SOFTWARE: { label: 'Сбой управляющего ПО / ЧПУ / ПЛК контроллера', color: 'info' },
  OPERATOR_ERROR: { label: 'Нарушение регламента эксплуатации / Ошибка персонала', color: 'default' },
  WEAR: { label: 'Предельное состояние / Естественная деградация', color: 'warning' },
  OTHER: { label: 'Прочая неустановленная неисправность', color: 'default' },
};

export const SRM_SOURCE_MAP: Record<string, { label: string; color: 'primary' | 'secondary' | 'info' | 'warning' | 'default' }> = {
  INTERNAL: { label: 'Внутренний ServiceDesk', color: 'primary' },
  JIRA: { label: 'Jira Service Management', color: 'info' },
  REDMINE: { label: 'Redmine', color: 'warning' },
  '1C': { label: '1С:ТОиР / 1C:ERP', color: 'secondary' },
  GITLAB: { label: 'GitLab Issues', color: 'info' },
  WEBHOOK: { label: 'REST Webhook / SCADA', color: 'default' },
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

export interface ApiResponse<T = unknown> {
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

// ==========================================
// 6. ТЕХНИЧЕСКОЕ ОБСЛУЖИВАНИЕ (MAINTENANCE)
// ==========================================

export interface SystemMaintenanceConfig {
  enabled: boolean;
  message?: string;
  estimatedUntil?: string | null;
  allowedRoles?: string[];
}

export interface ModuleMaintenanceConfig {
  enabled: boolean;
  message?: string;
  estimatedUntil?: string | null;
}

export interface PlatformMaintenanceStatus {
  system: SystemMaintenanceConfig;
  modules: {
    eps: ModuleMaintenanceConfig;
    wms: ModuleMaintenanceConfig;
    srm: ModuleMaintenanceConfig;
    mro: ModuleMaintenanceConfig;
  };
}

