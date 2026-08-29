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
  ADMIN_FEEDBACK_MANAGE: 'admin.feedback.manage',
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
  'admin.feedback.manage': {
    code: 'admin.feedback.manage',
    displayName: 'Центр обратной связи и техподдержки',
    module: 'admin',
    description: 'Просмотр всех обращений, модерация, смена статусов, назначение ответственных и переписка',
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
    description: 'Доступ к сводной панели надежности, списку поломок, инцидентов и метрикам MTTR / MTBF',
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
