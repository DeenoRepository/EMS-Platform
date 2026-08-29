import {
  PrismaClient,
  User,
  EquipmentStatus,
  FieldType,
  MaintenanceFrequency,
} from '@prisma/client';

export async function seedDomainData(
  prisma: PrismaClient,
  users: {
    adminUser: User;
    engineerUser: User;
    keeperUser: User;
  }
) {
  const { adminUser, engineerUser, keeperUser } = users;

  // 1. Теги оборудования
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

  // 2. Кастомные разделы оборудования (EPS)
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

  // 3. Кастомные поля
  const customFieldsData = [
    {
      sectionId: sectionClassifiers.id,
      key: 'decimal_number',
      name: 'Децимальный номер',
      fieldType: FieldType.TEXT,
      defaultValue: '',
      sortOrder: 1,
    },
    {
      sectionId: sectionClassifiers.id,
      key: 'okof_code',
      name: 'Код по ОКОФ (ОК 013-2014)',
      fieldType: FieldType.TEXT,
      defaultValue: '330.28.99.39',
      sortOrder: 2,
    },
    {
      sectionId: sectionClassifiers.id,
      key: 'okpd2_code',
      name: 'Код по ОКПД2 (ОК 034-2014)',
      fieldType: FieldType.TEXT,
      defaultValue: '28.99.39.190',
      sortOrder: 3,
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

  // 4. Демо-оборудование
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
        actual_wear_percentage: 12,
        criticality: 'Категория А (Критическое / Технологический стоп)',
        power_kw: 15,
        operating_voltage: '380 В',
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
        okof_code: '330.28.13.24',
        okpd2_code: '28.13.21.110',
        process_classifier_code: 'ТП-СВ-02',
        actual_wear_percentage: 18,
        power_kw: 45,
        operating_voltage: '380 В',
        calibration_interval: 12,
      },
      createdById: adminUser.id,
    },
  });

  await prisma.equipmentTag.deleteMany();
  await prisma.equipmentTag.createMany({
    data: [
      { equipmentId: equipment1.id, tagId: createdTags[0].id },
      { equipmentId: equipment1.id, tagId: createdTags[1].id },
      { equipmentId: equipment1.id, tagId: createdTags[2].id },
      { equipmentId: equipment2.id, tagId: createdTags[0].id },
      { equipmentId: equipment2.id, tagId: createdTags[5].id },
    ],
  });

  // 5. Склады и номенклатура (WMS)
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

  const nom1 = await prisma.nomenclature.upsert({
    where: { article: 'BRG-6204-2RS' },
    update: {},
    create: {
      name: 'Подшипник радиальный шариковый 6204-2RS (ГОСТ 8882-82 / ISO 6204-2RS)',
      article: 'BRG-6204-2RS',
      unit: 'шт',
      categoryId: catParts.id,
      description: 'Для подшипникового узла электродвигателя насоса Grundfos NB 50-200/219',
      minStock: 5,
    },
  });

  await prisma.stockItem.upsert({
    where: { warehouseId_nomenclatureId: { warehouseId: mainWarehouse.id, nomenclatureId: nom1.id } },
    update: { quantity: 18 },
    create: { warehouseId: mainWarehouse.id, nomenclatureId: nom1.id, quantity: 18 },
  });

  // 6. Планы ТО (MRO)
  const checklist1 = await prisma.checklistTemplate.create({
    data: {
      name: 'Чек-лист регламентного ежемесячного ТО (ТО-1) центробежного насосного агрегата',
      description: 'Контроль виброскорости, температуры узлов трения и отсутствия утечек',
      items: {
        create: [
          { description: 'Визуальный контроль отсутствия утечек рабочей среды', itemType: 'BOOLEAN', sortOrder: 1, isRequired: true },
          { description: 'Замер температуры корпуса подшипникового узла (норма ≤ +75 °C)', itemType: 'NUMERIC', sortOrder: 2, isRequired: true },
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
            scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            status: 'PLANNED',
          },
        ],
      },
    },
  });

  // 7. Начальное системное уведомление
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      title: 'Добро пожаловать в EMS!',
      message: 'Система успешно развернута. Доступны модули EPS, WMS, SRM и MRO.',
      type: 'SYSTEM',
      link: '/eps',
    },
  });
}
