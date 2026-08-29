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

export type FeedbackType = 'BUG' | 'FEATURE_REQUEST' | 'QUESTION' | 'OTHER';
export type FeedbackModule = 'EPS' | 'WMS' | 'SRM' | 'MRO' | 'ADMIN' | 'GENERAL';
export type FeedbackPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FeedbackStatus = 'NEW' | 'IN_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'DUPLICATE';

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, { label: string; color: string }> = {
  BUG: { label: 'Неисправность / Ошибка', color: '#ef4444' },
  FEATURE_REQUEST: { label: 'Предложение по улучшению', color: '#3b82f6' },
  QUESTION: { label: 'Вопрос / Консультация', color: '#8b5cf6' },
  OTHER: { label: 'Другое', color: '#64748b' },
};

export const FEEDBACK_MODULE_LABELS: Record<FeedbackModule, string> = {
  EPS: 'EPS — Оборудование',
  WMS: 'WMS — Складской учет',
  SRM: 'SRM — Сервис-деск',
  MRO: 'MRO — ТОиР',
  ADMIN: 'Администрирование',
  GENERAL: 'Общая функциональность',
};

export const FEEDBACK_PRIORITY_LABELS: Record<FeedbackPriority, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  LOW: { label: 'Низкий', color: 'info' },
  MEDIUM: { label: 'Средний', color: 'primary' },
  HIGH: { label: 'Высокий', color: 'warning' },
  CRITICAL: { label: 'Критический', color: 'error' },
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  NEW: { label: 'Новое', color: 'info' },
  IN_REVIEW: { label: 'На рассмотрении', color: 'warning' },
  IN_PROGRESS: { label: 'В работе', color: 'primary' },
  RESOLVED: { label: 'Решено / Реализовано', color: 'success' },
  REJECTED: { label: 'Отклонено', color: 'error' },
  DUPLICATE: { label: 'Дубликат', color: 'default' },
};
