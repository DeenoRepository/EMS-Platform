import { PrismaClient, EquipmentStatus, FieldType, OperationType, MaintenanceFrequency } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string, iterations = 210_000): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

async function main() {
  console.log('🌱 Начинаем сидирование базы данных EMS...');

  // 1. Создание прав (Permissions)
  const permissionsList = [
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
    { code: 'srm.sync.trigger', displayName: 'Синхронизация инцидентов', module: 'srm', description: 'Ручной запуск синхронизации с внешними Helpdesk/Jira' },
    { code: 'srm.reports.export', displayName: 'Экспорт отчетов SRM', module: 'srm', description: 'Выгрузка аналитики в Excel и PDF' },

    // MRO
    { code: 'mro.schedule.view', displayName: 'Просмотр графика ТО', module: 'mro', description: 'Календарь ППР и чек-листы' },
    { code: 'mro.schedule.manage', displayName: 'Управление графиком ТО', module: 'mro', description: 'Создание и назначение планов ТО' },
    { code: 'mro.execution.complete', displayName: 'Проведение ТО', module: 'mro', description: 'Заполнение чек-листов и списание запчастей' },

    // ADMIN
    { code: 'admin.users.manage', displayName: 'Управление пользователями', module: 'admin', description: 'Назначение ролей и блокировка' },
    { code: 'admin.roles.manage', displayName: 'Управление ролями', module: 'admin', description: 'Создание ролей и распределение прав' },
    { code: 'admin.audit.view', displayName: 'Просмотр журнала аудита', module: 'admin', description: 'Просмотр истории действий всех пользователей' },
    { code: 'admin.settings.manage', displayName: 'Управление настройками', module: 'admin', description: 'Конфигурация LDAP, Jira и системы' },
  ];

  for (const perm of permissionsList) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { displayName: perm.displayName, module: perm.module, description: perm.description },
      create: perm,
    });
  }
  console.log(`✅ Создано/обновлено прав: ${permissionsList.length}`);

  // 2. Создание ролей
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

  // Назначение всех прав администратору
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Назначение прав гостю (только view)
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
      p.code === 'srm.dashboard.view'
  );
  for (const perm of engineerPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: engineerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: engineerRole.id, permissionId: perm.id },
    });
  }

  // Назначение прав кладовщику (все wms права, кроме создания новых складов wms.warehouses.manage)
  const warehousePermissions = allPermissions.filter(
    (p) =>
      (p.module === 'wms' && p.code !== 'wms.warehouses.manage') ||
      p.code === 'eps.equipment.view' ||
      p.code === 'srm.dashboard.view'
  );
  for (const perm of warehousePermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: warehouseRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: warehouseRole.id, permissionId: perm.id },
    });
  }

  console.log('✅ Роли и права настроены');

  // 3. Создание базового пользователя admin
  const adminUser = await prisma.user.upsert({
    where: { ldapLogin: 'admin' },
    update: {
      displayName: 'Главный Администратор',
      email: 'admin@ems.local',
      passwordHash: hashPassword('admin123'),
    },
    create: {
      ldapLogin: 'admin',
      displayName: 'Главный Администратор',
      email: 'admin@ems.local',
      passwordHash: hashPassword('admin123'),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  // Создание тестового инженера
  const engineerUser = await prisma.user.upsert({
    where: { ldapLogin: 'engineer' },
    update: {
      displayName: 'Иван Петров (Инженер)',
      email: 'petrov@ems.local',
      passwordHash: hashPassword('engineer123'),
    },
    create: {
      ldapLogin: 'engineer',
      displayName: 'Иван Петров (Инженер)',
      email: 'petrov@ems.local',
      passwordHash: hashPassword('engineer123'),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: engineerUser.id, roleId: engineerRole.id } },
    update: {},
    create: { userId: engineerUser.id, roleId: engineerRole.id },
  });

  // Создание тестового кладовщика
  const keeperUser = await prisma.user.upsert({
    where: { ldapLogin: 'keeper' },
    update: {
      displayName: 'Сергей Смирнов (Кладовщик)',
      email: 'smirnov@ems.local',
      passwordHash: hashPassword('keeper123'),
    },
    create: {
      ldapLogin: 'keeper',
      displayName: 'Сергей Смирнов (Кладовщик)',
      email: 'smirnov@ems.local',
      passwordHash: hashPassword('keeper123'),
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: keeperUser.id, roleId: warehouseRole.id } },
    update: {},
    create: { userId: keeperUser.id, roleId: warehouseRole.id },
  });

  console.log('✅ Пользователи созданы (admin: admin123, engineer: engineer123, keeper: keeper123)');

  // 4. Теги оборудования
  const tagsData = [
    { name: 'Основное производство', color: '#1976d2' },
    { name: 'Критичное', color: '#d32f2f' },
    { name: 'Насосное оборудование', color: '#0288d1' },
    { name: 'Вентиляция', color: '#388e3c' },
    { name: 'Электропривод', color: '#f57c00' },
    { name: 'Компрессорное', color: '#7b1fa2' },
  ];

  const createdTags = [];
  for (const t of tagsData) {
    const tag = await prisma.tag.upsert({
      where: { name: t.name },
      update: { color: t.color },
      create: t,
    });
    createdTags.push(tag);
  }

  // 5. Кастомные разделы и поля оборудования (EPS)
  const sectionClassifiers = await prisma.customSection.upsert({
    where: { code: 'classifiers' },
    update: {
      name: 'Общероссийские и отраслевые классификаторы',
      description: 'Коды ОКОФ (ОК 013-2014), ОКПД2, классификаторы техпроцесса и типовые группы',
      icon: 'Category',
      sortOrder: 1,
    },
    create: {
      code: 'classifiers',
      name: 'Общероссийские и отраслевые классификаторы',
      description: 'Коды ОКОФ (ОК 013-2014), ОКПД2, классификаторы техпроцесса и типовые группы',
      icon: 'Category',
      sortOrder: 1,
    },
  });

  const sectionCondition = await prisma.customSection.upsert({
    where: { code: 'condition_wear' },
    update: {
      name: 'Техническое состояние, износ и критичность',
      description: 'Процент износа, критичность для производства, класс чистоты ISO, признаки уникальности и импорта',
      icon: 'Speed',
      sortOrder: 2,
    },
    create: {
      code: 'condition_wear',
      name: 'Техническое состояние, износ и критичность',
      description: 'Процент износа, критичность для производства, класс чистоты ISO, признаки уникальности и импорта',
      icon: 'Speed',
      sortOrder: 2,
    },
  });

  const sectionMaintenance = await prisma.customSection.upsert({
    where: { code: 'maintenance_regulations' },
    update: {
      name: 'Регламент ТОиР и график обслуживания',
      description: 'Периодичность регламентного ТО, график на текущий год, ответственные лица и связь с 1С',
      icon: 'Shield',
      sortOrder: 3,
    },
    create: {
      code: 'maintenance_regulations',
      name: 'Регламент ТОиР и график обслуживания',
      description: 'Периодичность регламентного ТО, график на текущий год, ответственные лица и связь с 1С',
      icon: 'Shield',
      sortOrder: 3,
    },
  });

  const sectionElectrical = await prisma.customSection.upsert({
    where: { code: 'electrical' },
    update: {
      name: 'Электротехнические параметры',
      description: 'Характеристики электропитания, мощности, напряжения и фазности оборудования',
      icon: 'Bolt',
      sortOrder: 4,
    },
    create: {
      code: 'electrical',
      name: 'Электротехнические параметры',
      description: 'Характеристики электропитания, мощности, напряжения и фазности оборудования',
      icon: 'Bolt',
      sortOrder: 4,
    },
  });

  const sectionMechanics = await prisma.customSection.upsert({
    where: { code: 'mechanics' },
    update: {
      name: 'Механика, гидравлика и среда',
      description: 'Рабочие среды, давление, обороты и смазочные материалы',
      icon: 'WaterDrop',
      sortOrder: 5,
    },
    create: {
      code: 'mechanics',
      name: 'Механика, гидравлика и среда',
      description: 'Рабочие среды, давление, обороты и смазочные материалы',
      icon: 'WaterDrop',
      sortOrder: 5,
    },
  });

  const sectionOperational = await prisma.customSection.upsert({
    where: { code: 'operational' },
    update: {
      name: 'Эксплуатационные требования и метрология',
      description: 'Непрерывность процесса, поверки датчиков и регламентные условия',
      icon: 'Straighten',
      sortOrder: 6,
    },
    create: {
      code: 'operational',
      name: 'Эксплуатационные требования и метрология',
      description: 'Непрерывность процесса, поверки датчиков и регламентные условия',
      icon: 'Straighten',
      sortOrder: 6,
    },
  });

  const customFieldsData = [
    // 1. Классификаторы
    {
      sectionId: sectionClassifiers.id,
      key: 'okof_code',
      name: 'Код по ОКОФ (ОК 013-2014)',
      fieldType: FieldType.TEXT,
      defaultValue: '330.28.99.39',
      sortOrder: 1,
    },
    {
      sectionId: sectionClassifiers.id,
      key: 'okpd2_code',
      name: 'Код по ОКПД2 (ОК 034-2014)',
      fieldType: FieldType.TEXT,
      defaultValue: '28.99.39.190',
      sortOrder: 2,
    },
    {
      sectionId: sectionClassifiers.id,
      key: 'process_classifier_code',
      name: 'Код технологического классификатора',
      fieldType: FieldType.TEXT,
      defaultValue: 'ТП-МХ-04',
      sortOrder: 3,
    },
    {
      sectionId: sectionClassifiers.id,
      key: 'equipment_group',
      name: 'Группа оборудования',
      fieldType: FieldType.SELECT,
      options: [
        'Механическое и химико-механическое',
        'Электротермическое и диффузионное',
        'Плазменное и газофазное',
        'Электрофизическое и вакуумное',
        'Оптическое и фотонное',
        'Электрохимическое',
        'Контрольно-измерительное',
        'Энергетическое и вспомогательное',
      ],
      defaultValue: 'Механическое и химико-механическое',
      sortOrder: 4,
    },
    {
      sectionId: sectionClassifiers.id,
      key: 'equipment_type',
      name: 'Тип оборудования (Установка)',
      fieldType: FieldType.SELECT,
      options: [
        'Насосы',
        'Компрессорное оборудование',
        'Вентиляционные установки',
        'Станки для резки',
        'Степперы / Сканеры',
        'Установки нанесения резиста',
        'Установки осаждения',
        'Установки напыления',
        'Диффузионные печи',
        'Ионные имплантеры',
        'Установки сухого травления',
        'Системы химической полировки',
        'Станки мокрой очистки',
        'Установки резки пластин',
        'Установки монтажа кристаллов',
        'Установки разварки кристаллов',
        'Установки герметизации',
        'Зондовые станции',
        'Автоматизированное тестовое оборудование',
        'Электронные/оптические микроскопы',
        'Стенды ЭТТ',
        'Электропечи',
        'Оборудование для пайки',
        'Ростовые установки',
      ],
      defaultValue: 'Насосы',
      sortOrder: 5,
    },

    // 2. Техническое состояние и износ
    {
      sectionId: sectionCondition.id,
      key: 'actual_wear_percentage',
      name: 'Фактический процент износа',
      fieldType: FieldType.NUMBER,
      unit: '%',
      defaultValue: '0',
      sortOrder: 1,
    },
    {
      sectionId: sectionCondition.id,
      key: 'criticality',
      name: 'Категория критичности',
      fieldType: FieldType.SELECT,
      options: [
        'Категория А (Критическое / Технологический стоп)',
        'Категория B (Основное / Дублируемое)',
        'Категория C (Вспомогательное)',
      ],
      defaultValue: 'Категория B (Основное / Дублируемое)',
      sortOrder: 2,
    },
    {
      sectionId: sectionCondition.id,
      key: 'clean_room_class',
      name: 'Класс чистоты помещения (ISO)',
      fieldType: FieldType.SELECT,
      options: [
        'ISO 1',
        'ISO 2',
        'ISO 3',
        'ISO 4',
        'ISO 5',
        'ISO 6',
        'ISO 7',
        'ISO 8',
        'Не регламентируется',
      ],
      defaultValue: 'ISO 6',
      sortOrder: 3,
    },
    {
      sectionId: sectionCondition.id,
      key: 'is_unique',
      name: 'Уникальное / единичное оборудование',
      fieldType: FieldType.BOOLEAN,
      defaultValue: 'false',
      sortOrder: 4,
    },
    {
      sectionId: sectionCondition.id,
      key: 'is_imported',
      name: 'Импортное оборудование',
      fieldType: FieldType.BOOLEAN,
      defaultValue: 'false',
      sortOrder: 5,
    },

    // 3. Регламент ТОиР и график обслуживания
    {
      sectionId: sectionMaintenance.id,
      key: 'maintenance_periodicity',
      name: 'Периодичность регламентного ТО',
      fieldType: FieldType.SELECT,
      options: [
        'Ежедневно',
        'Еженедельно',
        'Ежемесячно',
        '1 раз в квартал (ТО-1)',
        '1 раз в полугодие (ТО-2)',
        'Ежегодно (ТО-3)',
        'По наработке (моточасы)',
      ],
      defaultValue: '1 раз в квартал (ТО-1)',
      sortOrder: 1,
    },
    {
      sectionId: sectionMaintenance.id,
      key: 'maintenance_schedule_year',
      name: 'Утвержденный график ТО на 2026 год',
      fieldType: FieldType.TEXT,
      defaultValue: 'Утвержден согласно годовому графику ППР',
      sortOrder: 2,
    },
    {
      sectionId: sectionMaintenance.id,
      key: 'maintenance_count',
      name: 'Количество проведенных ТО / ремонтов',
      fieldType: FieldType.NUMBER,
      unit: 'шт',
      defaultValue: '0',
      sortOrder: 3,
    },
    {
      sectionId: sectionMaintenance.id,
      key: 'responsible_person_name',
      name: 'Ответственное лицо (ФИО / Должность)',
      fieldType: FieldType.TEXT,
      defaultValue: 'Иванов И.И. (Ведущий инженер)',
      sortOrder: 4,
    },
    {
      sectionId: sectionMaintenance.id,
      key: 'external_system_id',
      name: 'Идентификатор во внешней системе (1С / ERP)',
      fieldType: FieldType.TEXT,
      defaultValue: '1C-OS-2024-089',
      sortOrder: 5,
    },

    // 4. Электротехнические параметры
    {
      sectionId: sectionElectrical.id,
      key: 'power_kw',
      name: 'Номинальная мощность',
      fieldType: FieldType.NUMBER,
      unit: 'кВт',
      defaultValue: '15',
      sortOrder: 1,
    },
    {
      sectionId: sectionElectrical.id,
      key: 'operating_voltage',
      name: 'Рабочее напряжение',
      fieldType: FieldType.SELECT,
      unit: 'В',
      options: ['220 В', '380 В', '6 кВ', '10 кВ', '24 В DC'],
      defaultValue: '380 В',
      sortOrder: 2,
    },
    {
      sectionId: sectionElectrical.id,
      key: 'nominal_current',
      name: 'Номинальный ток',
      fieldType: FieldType.NUMBER,
      unit: 'А',
      defaultValue: '25',
      sortOrder: 3,
    },
    {
      sectionId: sectionElectrical.id,
      key: 'phase_count',
      name: 'Количество фаз',
      fieldType: FieldType.NUMBER,
      defaultValue: '3',
      sortOrder: 4,
    },
    {
      sectionId: sectionElectrical.id,
      key: 'ups_required',
      name: 'Требование к наличию ИБП',
      fieldType: FieldType.SELECT,
      options: ['Да', 'Нет'],
      defaultValue: 'Нет',
      sortOrder: 5,
    },

    // 5. Механика, гидравлика и среда
    {
      sectionId: sectionMechanics.id,
      key: 'operating_pressure',
      name: 'Рабочее давление',
      fieldType: FieldType.NUMBER,
      unit: 'бар',
      defaultValue: '16',
      sortOrder: 1,
    },
    {
      sectionId: sectionMechanics.id,
      key: 'rotation_speed',
      name: 'Частота вращения вала',
      fieldType: FieldType.NUMBER,
      unit: 'об/мин',
      defaultValue: '1500',
      sortOrder: 2,
    },
    {
      sectionId: sectionMechanics.id,
      key: 'coolant_type',
      name: 'Тип смазки / хладагента',
      fieldType: FieldType.TEXT,
      defaultValue: 'ISO VG 46',
      sortOrder: 3,
    },

    // 6. Эксплуатационные требования и метрология
    {
      sectionId: sectionOperational.id,
      key: 'is_critical_path',
      name: 'Влияет на непрерывность процесса',
      fieldType: FieldType.BOOLEAN,
      defaultValue: 'true',
      sortOrder: 1,
    },
    {
      sectionId: sectionOperational.id,
      key: 'calibration_interval',
      name: 'Периодичность поверки датчиков',
      fieldType: FieldType.NUMBER,
      unit: 'мес',
      defaultValue: '12',
      sortOrder: 2,
    },
  ];

  for (const cf of customFieldsData) {
    await prisma.customFieldDefinition.upsert({
      where: { key: cf.key },
      update: cf,
      create: cf,
    });
  }

  // 6. Оборудование (демо-данные)
  const equipment1 = await prisma.equipment.upsert({
    where: { inventoryNumber: 'EQ-2024-001' },
    update: {},
    create: {
      name: 'Центробежный насос подачи охлаждающей воды',
      inventoryNumber: 'EQ-2024-001',
      serialNumber: 'GR-8842-A',
      manufacturer: 'Grundfos',
      model: 'NB 50-200/219',
      location: 'Цех №1, Насосная станция, поз. Н-1',
      status: EquipmentStatus.ACTIVE,
      commissionDate: new Date('2022-03-15'),
      customFields: {
        okof_code: '330.28.13.14',
        okpd2_code: '28.13.14.110',
        process_classifier_code: 'ТП-ВО-01',
        equipment_group: 'Механическое и химико-механическое',
        equipment_type: 'Насосы',
        actual_wear_percentage: 12,
        criticality: 'Категория А (Критическое / Технологический стоп)',
        clean_room_class: 'Не регламентируется',
        is_unique: false,
        is_imported: true,
        maintenance_periodicity: '1 раз в квартал (ТО-1)',
        maintenance_schedule_year: 'Утвержден согласно графику ППР Цеха №1',
        maintenance_count: 4,
        responsible_person_name: 'Петров А.В. (Механик участка)',
        external_system_id: '1C-OS-4401',
        power_kw: 15,
        operating_voltage: '380 В',
        nominal_current: 28,
        phase_count: 3,
        ups_required: 'Нет',
        operating_pressure: 16,
        rotation_speed: 1500,
        coolant_type: 'Вода техническая',
        is_critical_path: true,
        calibration_interval: 12,
      },
      createdById: adminUser.id,
    },
  });

  const equipment2 = await prisma.equipment.upsert({
    where: { inventoryNumber: 'EQ-2024-002' },
    update: {},
    create: {
      name: 'Винтовой компрессор высокого давления',
      inventoryNumber: 'EQ-2024-002',
      serialNumber: 'AC-99120-X',
      manufacturer: 'Atlas Copco',
      model: 'GA 45 VSD+',
      location: 'Компрессорный цех, поз. К-2',
      status: EquipmentStatus.ACTIVE,
      commissionDate: new Date('2021-08-20'),
      customFields: {
        okof_code: '330.28.13.2',
        okpd2_code: '28.13.21.110',
        process_classifier_code: 'ТП-СВ-02',
        equipment_group: 'Энергетическое и вспомогательное',
        equipment_type: 'Компрессорное оборудование',
        actual_wear_percentage: 18,
        criticality: 'Категория А (Критическое / Технологический стоп)',
        clean_room_class: 'Не регламентируется',
        is_unique: false,
        is_imported: true,
        maintenance_periodicity: '1 раз в полугодие (ТО-2)',
        maintenance_schedule_year: 'Утвержден согласно графику ТО-2026',
        maintenance_count: 3,
        responsible_person_name: 'Сидоров К.М. (Главный энергетик)',
        external_system_id: '1C-OS-9912',
        power_kw: 45,
        operating_voltage: '380 В',
        nominal_current: 82,
        phase_count: 3,
        ups_required: 'Нет',
        operating_pressure: 13,
        rotation_speed: 3000,
        coolant_type: 'Roto Inject Fluid',
        is_critical_path: true,
        calibration_interval: 12,
      },
      createdById: adminUser.id,
    },
  });

  const equipment3 = await prisma.equipment.upsert({
    where: { inventoryNumber: 'EQ-2024-003' },
    update: {},
    create: {
      name: 'Приточно-вытяжная вентиляционная установка',
      inventoryNumber: 'EQ-2024-003',
      serialNumber: 'VE-400192',
      manufacturer: 'Systemair',
      model: 'Topvex FR 06',
      location: 'Венткамера главного корпуса',
      status: EquipmentStatus.UNDER_REPAIR,
      commissionDate: new Date('2020-01-10'),
      customFields: {
        power_kw: 7.5,
        operating_voltage: '380 В',
        is_critical_path: false,
      },
      createdById: adminUser.id,
    },
  });

  // Привязка тегов к оборудованию
  await prisma.equipmentTag.deleteMany();
  await prisma.equipmentTag.createMany({
    data: [
      { equipmentId: equipment1.id, tagId: createdTags[0].id },
      { equipmentId: equipment1.id, tagId: createdTags[1].id },
      { equipmentId: equipment1.id, tagId: createdTags[2].id },
      { equipmentId: equipment2.id, tagId: createdTags[0].id },
      { equipmentId: equipment2.id, tagId: createdTags[5].id },
      { equipmentId: equipment3.id, tagId: createdTags[3].id },
    ],
  });

  // 7. Склады и номенклатура (WMS)
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: { responsibleUserId: keeperUser.id },
    create: {
      name: 'Центральный склад запчастей и материалов',
      code: 'WH-MAIN',
      location: 'Корпус 4, складской комплекс',
      responsibleUserId: keeperUser.id,
    },
  });

  const shopWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-SHOP1' },
    update: { responsibleUserId: engineerUser.id },
    create: {
      name: 'Цеховой склад оперативного запаса (Цех №1)',
      code: 'WH-SHOP1',
      location: 'Цех №1, комната мастера',
      responsibleUserId: engineerUser.id,
    },
  });

  const catParts = await prisma.nomenclatureCategory.create({
    data: { name: 'Запасные части и узлы' },
  });
  const catOils = await prisma.nomenclatureCategory.create({
    data: { name: 'Смазочные материалы и жидкости' },
  });

  const nom1 = await prisma.nomenclature.upsert({
    where: { article: 'BRG-6204-2RS' },
    update: {},
    create: {
      name: 'Подшипник радиальный шариковый 6204 2RS',
      article: 'BRG-6204-2RS',
      unit: 'шт',
      categoryId: catParts.id,
      description: 'Для электродвигателей насосов Grundfos',
      minStock: 5,
    },
  });

  const nom2 = await prisma.nomenclature.upsert({
    where: { article: 'SEAL-25-42-10' },
    update: {},
    create: {
      name: 'Торцевое уплотнение вала 25х42х10 NBR',
      article: 'SEAL-25-42-10',
      unit: 'шт',
      categoryId: catParts.id,
      minStock: 2,
    },
  });

  const nom3 = await prisma.nomenclature.upsert({
    where: { article: 'OIL-VG-46' },
    update: {},
    create: {
      name: 'Масло компрессорное синтетическое ISO VG 46 (20л)',
      article: 'OIL-VG-46',
      unit: 'канистра',
      categoryId: catOils.id,
      minStock: 3,
    },
  });

  // Остатки
  await prisma.stockItem.upsert({
    where: { warehouseId_nomenclatureId: { warehouseId: mainWarehouse.id, nomenclatureId: nom1.id } },
    update: { quantity: 18 },
    create: { warehouseId: mainWarehouse.id, nomenclatureId: nom1.id, quantity: 18 },
  });

  await prisma.stockItem.upsert({
    where: { warehouseId_nomenclatureId: { warehouseId: mainWarehouse.id, nomenclatureId: nom2.id } },
    update: { quantity: 4 },
    create: { warehouseId: mainWarehouse.id, nomenclatureId: nom2.id, quantity: 4 },
  });

  await prisma.stockItem.upsert({
    where: { warehouseId_nomenclatureId: { warehouseId: mainWarehouse.id, nomenclatureId: nom3.id } },
    update: { quantity: 8 },
    create: { warehouseId: mainWarehouse.id, nomenclatureId: nom3.id, quantity: 8 },
  });

  // Связь запчастей с оборудованием
  await prisma.equipmentSparePart.deleteMany();
  await prisma.equipmentSparePart.createMany({
    data: [
      { equipmentId: equipment1.id, nomenclatureId: nom1.id },
      { equipmentId: equipment1.id, nomenclatureId: nom2.id },
      { equipmentId: equipment2.id, nomenclatureId: nom3.id },
    ],
  });

  // 8. Чек-листы и Планы ТО (MRO)
  const checklist1 = await prisma.checklistTemplate.create({
    data: {
      name: 'Чек-лист ежемесячного ТО насосного агрегата',
      description: 'Проверка подшипников, вибрации, давления и герметичности торцевого уплотнения',
      items: {
        create: [
          { description: 'Визуальный осмотр на отсутствие подтеканий', itemType: 'BOOLEAN', sortOrder: 1, isRequired: true },
          { description: 'Замер вибрации подшипникового узла (мм/с)', itemType: 'NUMERIC', sortOrder: 2, isRequired: true },
          { description: 'Замер температуры корпуса подшипника (°C)', itemType: 'NUMERIC', sortOrder: 3, isRequired: true },
          { description: 'Проверка давления на напорном патрубке (бар)', itemType: 'NUMERIC', sortOrder: 4, isRequired: true },
          { description: 'Проверка затяжки болтов фундамента и муфты', itemType: 'BOOLEAN', sortOrder: 5, isRequired: true },
        ],
      },
    },
  });

  await prisma.maintenancePlan.create({
    data: {
      equipmentId: equipment1.id,
      name: 'Ежемесячное техническое обслуживание (ТО-1)',
      description: 'Регламентные работы по насосному агрегату',
      frequency: MaintenanceFrequency.MONTHLY,
      checklistId: checklist1.id,
      schedules: {
        create: [
          {
            equipmentId: equipment1.id,
            title: 'ТО-1 Насоса охлаждающей воды',
            scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // через 5 дней
            status: 'PLANNED',
          },
        ],
      },
    },
  });

  // 9. Создание начального уведомления
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      title: 'Добро пожаловать в EMS!',
      message: 'Система успешно развернута. Доступны модули EPS, WMS, SRM и MRO.',
      type: 'SYSTEM',
      link: '/eps',
    },
  });

  console.log('✅ Сидирование базы данных успешно завершено!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка сидирования:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
