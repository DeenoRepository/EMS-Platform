export interface DatabaseFieldOption {
  key: string;
  name: string;
  group: string;
  fieldType: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT';
  unit?: string;
  description?: string;
  isRequired?: boolean;
  options?: string[];
}

export const DATABASE_EQUIPMENT_FIELD_OPTIONS: DatabaseFieldOption[] = [
  // 1. Основные реквизиты сущности оборудования
  {
    key: 'name',
    name: 'Наименование оборудования',
    group: 'Основные реквизиты позиции',
    fieldType: 'TEXT',
    isRequired: true,
    description: 'Полное наименование единицы оборудования',
  },
  {
    key: 'inventoryNumber',
    name: 'Инвентарный номер',
    group: 'Основные реквизиты позиции',
    fieldType: 'TEXT',
    isRequired: true,
    description: 'Уникальный инвентарный номер актива',
  },
  {
    key: 'serialNumber',
    name: 'Заводской (серийный) номер',
    group: 'Основные реквизиты позиции',
    fieldType: 'TEXT',
    isRequired: true,
    description: 'Заводской номер изготовителя',
  },
  {
    key: 'manufacturer',
    name: 'Предприятие-изготовитель',
    group: 'Основные реквизиты позиции',
    fieldType: 'TEXT',
    isRequired: true,
    description: 'Завод / компания-производитель',
  },
  {
    key: 'model',
    name: 'Модель / типоразмер',
    group: 'Основные реквизиты позиции',
    fieldType: 'TEXT',
    isRequired: true,
    description: 'Модель, модификация или марка оборудования',
  },
  {
    key: 'location',
    name: 'Место установки (локация)',
    group: 'Основные реквизиты позиции',
    fieldType: 'TEXT',
    isRequired: true,
    description: 'Цех, корпус, этаж, участок, технологическая позиция',
  },
  {
    key: 'status',
    name: 'Эксплуатационный статус',
    group: 'Основные реквизиты позиции',
    fieldType: 'SELECT',
    isRequired: true,
    description: 'Текущее состояние актива (В работе, В ремонте и др.)',
    options: ['В эксплуатации', 'В ремонте', 'На консервации', 'Списано', 'Черновик'],
  },
  {
    key: 'commissionDate',
    name: 'Дата ввода в эксплуатацию',
    group: 'Основные реквизиты позиции',
    fieldType: 'DATE',
    isRequired: true,
    description: 'Дата подписания акта ввода в работу',
  },

  // 2. Общероссийские и отраслевые классификаторы
  {
    key: 'decimal_number',
    name: 'Децимальный номер',
    group: 'Классификаторы и коды',
    fieldType: 'TEXT',
    description: 'Обозначение чертежа / децимальный номер по ГОСТ',
  },
  {
    key: 'okof_code',
    name: 'Код по ОКОФ (ОК 013-2014)',
    group: 'Классификаторы и коды',
    fieldType: 'TEXT',
    description: 'Код классификатора основных фондов',
  },
  {
    key: 'okpd2_code',
    name: 'Код по ОКПД2 (ОК 034-2014)',
    group: 'Классификаторы и коды',
    fieldType: 'TEXT',
    description: 'Код классификатора продукции по видам деятельности',
  },
  {
    key: 'process_classifier_code',
    name: 'Код технологического классификатора',
    group: 'Классификаторы и коды',
    fieldType: 'TEXT',
    description: 'Код технологического процесса / операции',
  },
  {
    key: 'equipment_group',
    name: 'Группа оборудования / подразделение',
    group: 'Классификаторы и коды',
    fieldType: 'TEXT',
    isRequired: true,
    description: 'Подразделение, участок или служба эксплуатации',
  },
  {
    key: 'equipment_type',
    name: 'Тип оборудования (Установка)',
    group: 'Классификаторы и коды',
    fieldType: 'TEXT',
    isRequired: true,
    description: 'Тип или технологическое назначение агрегата',
  },

  // 3. Техническое состояние, износ и надежность
  {
    key: 'country_origin',
    name: 'Страна производитель',
    group: 'Состояние, износ и надежность',
    fieldType: 'TEXT',
    description: 'Страна происхождения оборудования',
  },
  {
    key: 'prod_year',
    name: 'Год выпуска',
    group: 'Состояние, износ и надежность',
    fieldType: 'NUMBER',
    unit: 'г.',
    description: 'Год изготовления заводом',
  },
  {
    key: 'comm_year',
    name: 'Год ввода',
    group: 'Состояние, износ и надежность',
    fieldType: 'NUMBER',
    unit: 'г.',
    description: 'Год начала промышленной эксплуатации',
  },
  {
    key: 'equipment_age',
    name: 'Возраст оборудования',
    group: 'Состояние, износ и надежность',
    fieldType: 'NUMBER',
    unit: 'лет',
    description: 'Срок фактической службы',
  },
  {
    key: 'actual_wear_percentage',
    name: 'Фактический процент износа',
    group: 'Состояние, износ и надежность',
    fieldType: 'NUMBER',
    unit: '%',
    description: 'Степень физического износа оборудования',
  },
  {
    key: 'criticality',
    name: 'Категория критичности',
    group: 'Состояние, износ и надежность',
    fieldType: 'SELECT',
    isRequired: true,
    description: 'Влияние на остановку производственного цикла (A / B / C)',
    options: ['Категория A', 'Категория B', 'Категория C'],
  },
  {
    key: 'clean_room_class',
    name: 'Класс чистоты помещения (ISO)',
    group: 'Состояние, износ и надежность',
    fieldType: 'TEXT',
    description: 'Класс чистой производственной зоны',
  },
  {
    key: 'is_unique',
    name: 'Уникальное / единичное оборудование',
    group: 'Состояние, износ и надежность',
    fieldType: 'BOOLEAN',
    description: 'Признак единичного нестандартного оборудования',
  },
  {
    key: 'is_imported',
    name: 'Импортное оборудование',
    group: 'Состояние, износ и надежность',
    fieldType: 'BOOLEAN',
    description: 'Признак зарубежного производства',
  },

  // 4. Регламент ТОиР и график обслуживания
  {
    key: 'maintenance_periodicity',
    name: 'Периодичность регламентного ТО',
    group: 'Регламент ТОиР и обслуживание',
    fieldType: 'TEXT',
    isRequired: true,
    description: 'Интервал проведения регламентных работ (ежемесячно, квартально и т.д.)',
  },
  {
    key: 'maintenance_schedule_year',
    name: 'Утвержденный график ТО на год',
    group: 'Регламент ТОиР и обслуживание',
    fieldType: 'TEXT',
    description: 'Номер или реквизиты графика ППР',
  },
  {
    key: 'to_count_scheduled',
    name: 'Количество ТО по графику',
    group: 'Регламент ТОиР и обслуживание',
    fieldType: 'NUMBER',
    description: 'Запланированное число ТО на период',
  },
  {
    key: 'responsible_person_name',
    name: 'Ответственное лицо (МОЛ)',
    group: 'Регламент ТОиР и обслуживание',
    fieldType: 'TEXT',
    isRequired: true,
    description: 'Материально ответственное лицо из базы пользователей',
  },
  {
    key: 'external_system_id',
    name: 'Идентификатор в 1С / ERP',
    group: 'Регламент ТОиР и обслуживание',
    fieldType: 'TEXT',
    description: 'Код связи с внешней системой учета',
  },

  // 5. Электротехнические параметры
  {
    key: 'operating_voltage',
    name: 'Рабочее напряжение питания',
    group: 'Электротехнические параметры',
    fieldType: 'TEXT',
    unit: 'В',
    description: 'Номинальное напряжение сети (220В, 380В и др.)',
  },
  {
    key: 'power_kw',
    name: 'Потребляемая мощность',
    group: 'Электротехнические параметры',
    fieldType: 'NUMBER',
    unit: 'кВт',
    description: 'Установленная электрическая мощность',
  },
  {
    key: 'nominal_current',
    name: 'Номинальный рабочий ток',
    group: 'Электротехнические параметры',
    fieldType: 'NUMBER',
    unit: 'А',
    description: 'Рабочий ток нагрузки',
  },
  {
    key: 'phase_count',
    name: 'Количество фаз электросети',
    group: 'Электротехнические параметры',
    fieldType: 'TEXT',
    description: 'Однофазная / трехфазная сеть',
  },
  {
    key: 'ups_required',
    name: 'Требование подключения через ИБП',
    group: 'Электротехнические параметры',
    fieldType: 'TEXT',
    description: 'Необходимость источника бесперебойного питания',
  },

  // 6. Механика, гидравлика и среда
  {
    key: 'operating_pressure',
    name: 'Рабочее давление системы',
    group: 'Механика, гидравлика и среда',
    fieldType: 'NUMBER',
    unit: 'МПа',
    description: 'Давление гидросистемы или пневмосети',
  },
  {
    key: 'coolant_type',
    name: 'Тип смазки / хладагента',
    group: 'Механика, гидравлика и среда',
    fieldType: 'TEXT',
    description: 'Марка масел, смазок или рабочих жидкостей',
  },
  {
    key: 'rotation_speed',
    name: 'Частота вращения вала / ротора',
    group: 'Механика, гидравлика и среда',
    fieldType: 'NUMBER',
    unit: 'об/мин',
    description: 'Максимальные обороты шпинделя или ротора',
  },

  // 7. Эксплуатационные требования и метрология
  {
    key: 'is_critical_path',
    name: 'Влияет на непрерывность процесса',
    group: 'Метрология и эксплуатация',
    fieldType: 'BOOLEAN',
    description: 'Критический путь технологической цепочки',
  },
  {
    key: 'calibration_interval',
    name: 'Периодичность поверки датчиков',
    group: 'Метрология и эксплуатация',
    fieldType: 'NUMBER',
    unit: 'мес.',
    description: 'Межповерочный интервал измерительных приборов',
  },
];
