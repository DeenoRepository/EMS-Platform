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
  const sectionElectrical = await prisma.customSection.upsert({
    where: { code: 'electrical' },
    update: {
      name: 'Электротехнические параметры',
      description: 'Характеристики электропитания, мощности и фазности оборудования',
      icon: 'Bolt',
      sortOrder: 1,
    },
    create: {
      code: 'electrical',
      name: 'Электротехнические параметры',
      description: 'Характеристики электропитания, мощности и фазности оборудования',
      icon: 'Bolt',
      sortOrder: 1,
    },
  });

  const sectionMechanics = await prisma.customSection.upsert({
    where: { code: 'mechanics' },
    update: {
      name: 'Механика и гидравлика',
      description: 'Рабочие среды, давление, обороты и смазочные материалы',
      icon: 'WaterDrop',
      sortOrder: 2,
    },
    create: {
      code: 'mechanics',
      name: 'Механика и гидравлика',
      description: 'Рабочие среды, давление, обороты и смазочные материалы',
      icon: 'WaterDrop',
      sortOrder: 2,
    },
  });

  const sectionOperational = await prisma.customSection.upsert({
    where: { code: 'operational' },
    update: {
      name: 'Эксплуатационные требования и метрология',
      description: 'Критичность, поверки и регламентные условия',
      icon: 'Shield',
      sortOrder: 3,
    },
    create: {
      code: 'operational',
      name: 'Эксплуатационные требования и метрология',
      description: 'Критичность, поверки и регламентные условия',
      icon: 'Shield',
      sortOrder: 3,
    },
  });

  const customFieldsData = [
    {
      sectionId: sectionElectrical.id,
      key: 'power_kw',
      name: 'Номинальная мощность',
      fieldType: FieldType.NUMBER,
      unit: 'кВт',
      defaultValue: '0',
      sortOrder: 1,
    },
    {
      sectionId: sectionElectrical.id,
      key: 'operating_voltage',
      name: 'Рабочее напряжение',
      fieldType: FieldType.SELECT,
      unit: 'В',
      options: ['220 В', '380 В', '6 кВ', '10 кВ'],
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
        power_kw: 15,
        operating_voltage: '380 В',
        coolant_type: 'Вода техническая',
        is_critical_path: true,
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
        power_kw: 45,
        operating_voltage: '380 В',
        coolant_type: 'Roto Inject Fluid',
        is_critical_path: true,
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
