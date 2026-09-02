import { PrismaClient } from '@prisma/client';

export const PERMISSIONS_LIST = [
  // EPS
  { code: 'eps.equipment.view', displayName: 'Просмотр оборудования', module: 'eps', description: 'Доступ к реестру и карточкам оборудования' },
  { code: 'eps.equipment.create', displayName: 'Создание оборудования', module: 'eps', description: 'Возможность создавать новые единицы оборудования' },
  { code: 'eps.equipment.edit', displayName: 'Редактирование оборудования', module: 'eps', description: 'Изменение данных паспорта оборудования' },
  { code: 'eps.equipment.delete', displayName: 'Удаление оборудования', module: 'eps', description: 'Удаление единиц оборудования' },
  { code: 'eps.documents.view', displayName: 'Просмотр документов', module: 'eps', description: 'Просмотр чертежей, схем и документов оборудования' },
  { code: 'eps.documents.upload', displayName: 'Загрузка документов', module: 'eps', description: 'Прикрепление файлов и схем к оборудованию' },
  { code: 'eps.custom_fields.manage', displayName: 'Управление кастомными полями', module: 'eps', description: 'Создание и редактирование структуры полей' },
  { code: 'eps.approvals.view', displayName: 'Просмотр согласований', module: 'eps', description: 'Просмотр заявок на ввод, списание и изменение статуса' },
  { code: 'eps.approvals.create', displayName: 'Подача заявок на согласование', module: 'eps', description: 'Создание заявок на ввод в эксплуатацию и списание' },
  { code: 'eps.approvals.manage', displayName: 'Утверждение согласований', module: 'eps', description: 'Рассмотрение, утверждение и отклонение заявок' },
  { code: 'eps.history.view', displayName: 'Просмотр истории изменений', module: 'eps', description: 'Просмотр журнала аудита изменений оборудования' },
  { code: 'eps.reports.view', displayName: 'Просмотр отчетов EPS', module: 'eps', description: 'Формирование и выгрузка отчетов по оборудованию' },
  { code: 'eps.reports.manage', displayName: 'Управление шаблонами отчетов', module: 'eps', description: 'Создание и редактирование шаблонов отчетов' },
  { code: 'eps.import.execute', displayName: 'Импорт оборудования', module: 'eps', description: 'Пакетный импорт оборудования из файлов Excel' },

  // WMS
  { code: 'wms.stock.view', displayName: 'Просмотр остатков и складов', module: 'wms', description: 'Просмотр наличия ТМЦ и складов' },
  { code: 'wms.operations.create', displayName: 'Проведение складских операций', module: 'wms', description: 'Приход, расход, перемещение ТМЦ' },
  { code: 'wms.nomenclature.manage', displayName: 'Управление номенклатурой', module: 'wms', description: 'Создание и редактирование ТМЦ' },
  { code: 'wms.warehouses.manage', displayName: 'Управление складами', module: 'wms', description: 'Создание складов, редактирование реквизитов и назначение МОЛ' },
  { code: 'wms.zones.manage', displayName: 'Конфигурация зон и ячеек', module: 'wms', description: 'Создание и редактирование зон и ячеек адресного хранения' },
  { code: 'wms.inventory.manage', displayName: 'Инвентаризация', module: 'wms', description: 'Создание и закрытие актов инвентаризации' },

  // SRM
  { code: 'srm.dashboard.view', displayName: 'Просмотр системы подачи заявок', module: 'srm', description: 'Доступ к заявкам, инцидентам, графикам и метрикам MTTR/MTBF' },
  { code: 'srm.requests.create', displayName: 'Подача сервисных заявок и инцидентов', module: 'srm', description: 'Создание внутренних заявок на неисправность и ремонт оборудования' },
  { code: 'srm.requests.manage', displayName: 'Управление инцидентами и нарядами', module: 'srm', description: 'Назначение исполнителей, сброс статусов, передача в MRO и закрытие инцидентов' },
  { code: 'srm.reliability.view', displayName: 'Аналитика надежности RAMS & RCM', module: 'srm', description: 'Доступ к расчетам MTTR, MTBF, КТГ, анализу Парето и причинам простоев' },
  { code: 'srm.warranty.manage', displayName: 'Управление гарантиями и рекламациями', module: 'srm', description: 'Ведение гарантийных случаев, сервисных договоров и рекламационных актов' },
  { code: 'srm.sync.trigger', displayName: 'Синхронизация инцидентов', module: 'srm', description: 'Ручной запуск синхронизации с внешними Helpdesk/Jira' },
  { code: 'srm.reports.export', displayName: 'Экспорт отчетов SRM', module: 'srm', description: 'Выгрузка аналитики в Excel и PDF' },

  // MRO
  { code: 'mro.schedule.view', displayName: 'Просмотр графика ТО', module: 'mro', description: 'Календарь ППР и чек-листы' },
  { code: 'mro.schedule.manage', displayName: 'Управление графиком ТО', module: 'mro', description: 'Создание и назначение планов ТО' },
  { code: 'mro.execution.complete', displayName: 'Проведение ТО', module: 'mro', description: 'Заполнение чек-листов и списание запчастей' },

  // PRM
  { code: 'prm.requests.view', displayName: 'Просмотр заявок на закупку ТМЦ', module: 'prm', description: 'Доступ к реестру заявок на закупку ТМЦ' },
  { code: 'prm.requests.create', displayName: 'Подача заявок на закупку ТМЦ', module: 'prm', description: 'Формирование и отправка заявок на закупку' },
  { code: 'prm.requests.manage', displayName: 'Согласование заявок на закупку ТМЦ', module: 'prm', description: 'Утверждение, отклонение и отмена заявок на закупку' },

  // ADMIN
  { code: 'admin.users.manage', displayName: 'Управление пользователями', module: 'admin', description: 'Назначение ролей и блокировка' },
  { code: 'admin.roles.manage', displayName: 'Управление ролями', module: 'admin', description: 'Создание ролей и распределение прав' },
  { code: 'admin.audit.view', displayName: 'Просмотр журнала аудита', module: 'admin', description: 'Просмотр истории действий всех пользователей' },
  { code: 'admin.settings.manage', displayName: 'Управление настройками', module: 'admin', description: 'Конфигурация LDAP, Jira и системы' },
  { code: 'admin.feedback.manage', displayName: 'Управление обратной связью', module: 'admin', description: 'Просмотр всех обращений, модерация, смена статусов и ответы' },
];

export async function seedPermissionsAndRoles(prisma: PrismaClient) {
  for (const perm of PERMISSIONS_LIST) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { displayName: perm.displayName, module: perm.module, description: perm.description },
      create: perm,
    });
  }

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { displayName: 'Администратор системы', isSystem: true },
    create: {
      name: 'admin',
      displayName: 'Администратор системы',
      description: 'Полный неограниченный доступ ко всем модулям и настройкам',
      isSystem: true,
    },
  });

  const guestRole = await prisma.role.upsert({
    where: { name: 'guest' },
    update: { displayName: 'Гость (Только чтение)', isSystem: true },
    create: {
      name: 'guest',
      displayName: 'Гость (Только чтение)',
      description: 'Доступ только на просмотр базовой информации',
      isSystem: true,
    },
  });

  const engineerRole = await prisma.role.upsert({
    where: { name: 'engineer' },
    update: { displayName: 'Инженер-механик / энергетик' },
    create: {
      name: 'engineer',
      displayName: 'Инженер-механик / энергетик',
      description: 'Работа с паспортами оборудования, проведение ТО и просмотр склада',
      isSystem: false,
    },
  });

  const warehouseRole = await prisma.role.upsert({
    where: { name: 'warehouse_manager' },
    update: { displayName: 'Заведующий складом / Кладовщик' },
    create: {
      name: 'warehouse_manager',
      displayName: 'Заведующий складом / Кладовщик',
      description: 'Управление складами, остатками ТМЦ, операциями прихода/расхода и инвентаризацией',
      isSystem: false,
    },
  });

  const allPermissions = await prisma.permission.findMany();

  // Назначение всех прав администратору
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Назначение прав гостю
  const viewPermissions = allPermissions.filter((p) => p.code.endsWith('.view'));
  for (const perm of viewPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: guestRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: guestRole.id, permissionId: perm.id },
    });
  }

  // Назначение прав инженеру
  const engineerPermissions = allPermissions.filter(
    (p) =>
      p.module === 'eps' ||
      p.module === 'mro' ||
      p.code === 'wms.stock.view' ||
      p.code === 'srm.dashboard.view' ||
      p.code === 'prm.requests.view' ||
      p.code === 'prm.requests.create'
  );
  for (const perm of engineerPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: engineerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: engineerRole.id, permissionId: perm.id },
    });
  }

  // Назначение прав кладовщику
  const warehousePermissions = allPermissions.filter(
    (p) =>
      (p.module === 'wms' && p.code !== 'wms.warehouses.manage') ||
      p.code === 'eps.equipment.view' ||
      p.code === 'srm.dashboard.view' ||
      p.module === 'prm'
  );
  for (const perm of warehousePermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: warehouseRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: warehouseRole.id, permissionId: perm.id },
    });
  }

  return { adminRole, guestRole, engineerRole, warehouseRole };
}
