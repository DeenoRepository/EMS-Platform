import { Prisma, EquipmentStatus } from '@ems/database';

/**
 * Построение Prisma.EquipmentWhereInput для фильтрации по всем полям таблицы реестра
 */
export function buildEquipmentWhereInput(searchParams: URLSearchParams): Prisma.EquipmentWhereInput {
  const where: Prisma.EquipmentWhereInput = {
    deletedAt: null,
  };

  const andConditions: Prisma.EquipmentWhereInput[] = [];

  applyTextSearchFilters(andConditions, searchParams);
  applyEnumAndRelationFilters(andConditions, searchParams);
  applyDateRangeFilters(andConditions, searchParams);
  applyCustomFieldsFilters(andConditions, searchParams);
  applyClassifierAndBooleanFilters(andConditions, searchParams);

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

/**
 * Построение Prisma.EquipmentOrderByWithRelationInput для сортировки по всей базе данных
 */
export function buildEquipmentOrderBy(searchParams: URLSearchParams): Prisma.EquipmentOrderByWithRelationInput {
  const sortBy = searchParams.get('sortBy') || searchParams.get('sortField') || 'updatedAt';
  const sortDirection = (searchParams.get('sortOrder') || searchParams.get('sortDirection') || 'desc').toLowerCase();
  const dir: Prisma.SortOrder = sortDirection === 'asc' ? 'asc' : 'desc';

  switch (sortBy) {
    case 'name':
      return { name: dir };
    case 'inventoryNumber':
      return { inventoryNumber: dir };
    case 'serialNumber':
      return { serialNumber: dir };
    case 'manufacturer':
      return { manufacturer: dir };
    case 'model':
      return { model: dir };
    case 'location':
      return { location: dir };
    case 'status':
      return { status: dir };
    case 'commissionDate':
      return { commissionDate: dir };
    case 'createdAt':
      return { createdAt: dir };
    case 'updatedAt':
      return { updatedAt: dir };
    case 'documentsCount':
      return { documents: { _count: dir } };
    case 'sparePartsCount':
      return { spareParts: { _count: dir } };
    default:
      return { updatedAt: dir };
  }
}

/**
 * Фильтрация по текстовым колонкам (глобальный поиск и поля таблицы)
 */
function applyTextSearchFilters(and: Prisma.EquipmentWhereInput[], params: URLSearchParams): void {
  const search = params.get('search')?.trim();
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { inventoryNumber: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { customFields: { path: ['decimal_number'], string_contains: search } },
        { customFields: { path: ['detsimalnyy_nomer'], string_contains: search } },
        { customFields: { path: ['decimalNumber'], string_contains: search } },
      ],
    });
  }

  const textFields = ['inventoryNumber', 'name', 'serialNumber', 'manufacturer', 'model', 'location'] as const;
  for (const field of textFields) {
    const val = params.get(field)?.trim();
    if (val) {
      and.push({ [field]: { contains: val, mode: 'insensitive' } });
    }
  }

  const decimalNumber = params.get('decimalNumber')?.trim() || params.get('decimal_number')?.trim();
  if (decimalNumber) {
    and.push({
      OR: [
        { customFields: { path: ['decimal_number'], string_contains: decimalNumber } },
        { customFields: { path: ['detsimalnyy_nomer'], string_contains: decimalNumber } },
        { customFields: { path: ['decimalNumber'], string_contains: decimalNumber } },
      ],
    });
  }

  const completeness = params.get('completeness')?.trim();
  if (completeness === 'incomplete') {
    and.push({
      OR: [
        { inventoryNumber: null },
        { serialNumber: null },
        { manufacturer: null },
        { model: null },
        { location: null },
        { commissionDate: null },
      ],
    });
  } else if (completeness === 'complete') {
    and.push({
      AND: [
        { inventoryNumber: { not: null } },
        { serialNumber: { not: null } },
        { manufacturer: { not: null } },
        { model: { not: null } },
        { location: { not: null } },
        { commissionDate: { not: null } },
      ],
    });
  }
}

/**
 * Фильтрация по статусу, тегам и связям (наличие документов, ЗИП)
 */
function applyEnumAndRelationFilters(and: Prisma.EquipmentWhereInput[], params: URLSearchParams): void {
  const status = params.get('status') as EquipmentStatus | null;
  if (status && Object.values(EquipmentStatus).includes(status)) {
    and.push({ status });
  }

  const tagId = params.get('tagId')?.trim();
  if (tagId) {
    and.push({ tags: { some: { tagId } } });
  }

  const documentsFilter = params.get('documentsFilter')?.trim();
  if (documentsFilter === 'with') {
    and.push({ documents: { some: {} } });
  } else if (documentsFilter === 'without') {
    and.push({ documents: { none: {} } });
  }

  const sparePartsFilter = params.get('sparePartsFilter')?.trim();
  if (sparePartsFilter === 'with') {
    and.push({ spareParts: { some: {} } });
  } else if (sparePartsFilter === 'without') {
    and.push({ spareParts: { none: {} } });
  }
}

/**
 * Фильтрация по диапазонам дат (ввод в экспл., создание, обновление)
 */
function applyDateRangeFilters(and: Prisma.EquipmentWhereInput[], params: URLSearchParams): void {
  applySingleDateRange(and, 'commissionDate', params.get('commissionDateFrom'), params.get('commissionDateTo'));
  applySingleDateRange(and, 'createdAt', params.get('createdAtFrom'), params.get('createdAtTo'));
  applySingleDateRange(and, 'updatedAt', params.get('updatedAtFrom'), params.get('updatedAtTo'));
}

function applySingleDateRange(
  and: Prisma.EquipmentWhereInput[],
  field: 'commissionDate' | 'createdAt' | 'updatedAt',
  from?: string | null,
  to?: string | null
): void {
  if (!from && !to) return;
  const range: Prisma.DateTimeFilter = {};
  if (from) {
    const dFrom = new Date(from.includes('T') ? from : `${from}T00:00:00.000Z`);
    if (!isNaN(dFrom.getTime())) range.gte = dFrom;
  }
  if (to) {
    const dTo = new Date(to.includes('T') ? to : `${to}T23:59:59.999Z`);
    if (!isNaN(dTo.getTime())) range.lte = dTo;
  }
  and.push({ [field]: range });
}

/**
 * Фильтрация по кастомным полям и характеристикам в JSON
 */
function applyCustomFieldsFilters(and: Prisma.EquipmentWhereInput[], params: URLSearchParams): void {
  const criticality = params.get('criticality')?.trim();
  if (criticality) {
    and.push({
      customFields: {
        path: ['criticality'],
        equals: criticality,
      },
    });
  }

  const cleanRoom = params.get('cleanRoom')?.trim();
  if (cleanRoom) {
    and.push({
      customFields: {
        path: ['clean_room_class'],
        string_contains: cleanRoom,
      },
    });
  }

  const okofCode = params.get('okofCode')?.trim();
  if (okofCode) {
    and.push({
      customFields: {
        path: ['okof_code'],
        string_contains: okofCode,
      },
    });
  }

  const okpd2Code = params.get('okpd2Code')?.trim();
  if (okpd2Code) {
    and.push({
      customFields: {
        path: ['okpd2_code'],
        string_contains: okpd2Code,
      },
    });
  }

  const procCode = params.get('procCode')?.trim();
  if (procCode) {
    and.push({
      customFields: {
        path: ['process_classifier_code'],
        string_contains: procCode,
      },
    });
  }

  const maintPeriodicity = (params.get('maintPeriodicity') || params.get('maintenance_periodicity'))?.trim();
  if (maintPeriodicity) {
    and.push({
      customFields: {
        path: ['maintenance_periodicity'],
        string_contains: maintPeriodicity,
      },
    });
  }

  const respPerson = (params.get('respPerson') || params.get('responsible_person_name'))?.trim();
  if (respPerson) {
    and.push({ customFields: { path: ['responsible_person_name'], string_contains: respPerson } });
  }

}

/**
 * Фильтрация по классификаторам (вид, подразделение) и логическим флагам
 */
function applyClassifierAndBooleanFilters(and: Prisma.EquipmentWhereInput[], params: URLSearchParams): void {
  const eqGroup = (params.get('eqGroup') || params.get('equipment_group') || params.get('department'))?.trim();
  if (eqGroup) {
    and.push({
      OR: [
        { customFields: { path: ['department'], string_contains: eqGroup } },
        { customFields: { path: ['service_group'], string_contains: eqGroup } },
        { customFields: { path: ['equipment_group'], string_contains: eqGroup } },
      ],
    });
  }

  const eqType = (params.get('eqType') || params.get('equipment_type') || params.get('equipment_kind'))?.trim();
  if (eqType) {
    and.push({
      OR: [
        { customFields: { path: ['equipment_kind'], string_contains: eqType } },
        { customFields: { path: ['equipment_type'], string_contains: eqType } },
      ],
    });
  }

  applyBooleanField(and, 'is_critical_path', params.get('isCriticalPath'));
  applyBooleanField(and, 'is_unique', params.get('isUnique'));
  applyBooleanField(and, 'is_imported', params.get('isImported'));
}

function applyBooleanField(and: Prisma.EquipmentWhereInput[], fieldKey: string, val?: string | null): void {
  const v = val?.trim();
  if (v === 'true') {
    and.push({
      OR: [
        { customFields: { path: [fieldKey], equals: true } },
        { customFields: { path: [fieldKey], equals: 'true' } },
        { customFields: { path: [fieldKey], equals: 'Да' } },
        { customFields: { path: [fieldKey], equals: 'да' } },
        { customFields: { path: [fieldKey], equals: 1 } },
      ],
    });
  } else if (v === 'false') {
    and.push({
      NOT: {
        OR: [
          { customFields: { path: [fieldKey], equals: true } },
          { customFields: { path: [fieldKey], equals: 'true' } },
          { customFields: { path: [fieldKey], equals: 'Да' } },
          { customFields: { path: [fieldKey], equals: 'да' } },
          { customFields: { path: [fieldKey], equals: 1 } },
        ],
      },
    });
  }
}
