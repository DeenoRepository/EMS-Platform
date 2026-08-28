import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, EquipmentStatus } from '@ems/database';
import { PERMISSIONS, EQUIPMENT_STATUS_MAP, formatDate, formatDateTime } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { limit: 15, windowMs: 60 * 1000, prefix: 'report-gen' });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (
      !hasPermission(user, PERMISSIONS.EPS_REPORTS_VIEW) &&
      !hasPermission(user, PERMISSIONS.EPS_REPORTS_MANAGE) &&
      !user.roles.includes('admin')
    ) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const {
      selectedColumns = [],
      filters = {},
      sort = { field: 'createdAt', order: 'desc' },
      limit,
    } = body;

    // Fetch custom sections and fields definition for dictionary
    const [sections, unassignedFields] = await Promise.all([
      prisma.customSection.findMany({
        include: {
          fields: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.customFieldDefinition.findMany({
        where: { sectionId: null },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    // Build columns dictionary
    const baseColumns = [
      { key: 'name', name: 'Наименование оборудования', category: 'Основные реквизиты' },
      { key: 'inventoryNumber', name: 'Инвентарный номер', category: 'Основные реквизиты' },
      { key: 'serialNumber', name: 'Заводской (серийный) №', category: 'Основные реквизиты' },
      { key: 'manufacturer', name: 'Производитель', category: 'Основные реквизиты' },
      { key: 'model', name: 'Модель / Модификация', category: 'Основные реквизиты' },
      { key: 'location', name: 'Место установки (Локация)', category: 'Основные реквизиты' },
      { key: 'status', name: 'Текущий статус', category: 'Основные реквизиты' },
      { key: 'criticality', name: 'Категория критичности (A/B/C)', category: 'Классификаторы' },
      { key: 'actual_wear_percentage', name: 'Физический износ (%)', category: 'Классификаторы' },
      { key: 'equipment_group', name: 'Группа оборудования', category: 'Классификаторы' },
      { key: 'equipment_type', name: 'Вид оборудования', category: 'Классификаторы' },
      { key: 'responsible_person_name', name: 'Ответственное лицо (МОЛ)', category: 'Классификаторы' },
      { key: 'okof_code', name: 'Код ОКОФ', category: 'Классификаторы' },
      { key: 'okpd2_code', name: 'Код ОКПД2', category: 'Классификаторы' },
      { key: 'process_classifier_code', name: 'Код техпроцесса', category: 'Классификаторы' },
      { key: 'maintenance_periodicity', name: 'Периодичность ТО', category: 'Эксплуатация и ТО' },
      { key: 'calibration_interval', name: 'Межповерочный интервал (мес.)', category: 'Эксплуатация и ТО' },
      { key: 'clean_room_class', name: 'Класс чистого помещения', category: 'Эксплуатация и ТО' },
      { key: 'is_critical_path', name: 'Критический путь', category: 'Эксплуатация и ТО' },
      { key: 'is_unique', name: 'Уникальное оборудование', category: 'Эксплуатация и ТО' },
      { key: 'is_imported', name: 'Импортное оборудование', category: 'Эксплуатация и ТО' },
      { key: 'commissionDate', name: 'Дата ввода в эксплуатацию', category: 'Основные реквизиты' },
      { key: 'tags', name: 'Теги / Метки', category: 'Основные реквизиты' },
      { key: 'createdAt', name: 'Дата регистрации', category: 'Аудит' },
      { key: 'createdBy', name: 'Паспорт зарегистрировал', category: 'Аудит' },
      { key: 'documentsCount', name: 'Документов (шт.)', category: 'Сводные данные' },
      { key: 'photosCount', name: 'Фотографий (шт.)', category: 'Сводные данные' },
      { key: 'maintenancePlansCount', name: 'Планов ТО и ППР (шт.)', category: 'Сводные данные' },
      { key: 'sparePartsCount', name: 'Запасных частей WMS (шт.)', category: 'Сводные данные' },
      { key: 'jiraIssuesCount', name: 'Заявок в Jira (шт.)', category: 'Сводные данные' },
    ];

    const customColumns: { key: string; name: string; category: string; unit?: string | null }[] = [];

    sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        customColumns.push({
          key: `custom_${f.key}`,
          name: f.unit ? `${f.name} (${f.unit})` : f.name,
          category: sec.name,
          unit: f.unit,
        });
      });
    });

    unassignedFields.forEach((f) => {
      customColumns.push({
        key: `custom_${f.key}`,
        name: f.unit ? `${f.name} (${f.unit})` : f.name,
        category: 'Дополнительные параметры',
        unit: f.unit,
      });
    });

    const allAvailableColumns = [...baseColumns, ...customColumns];

    // Build prisma query where filter
    const where: any = {};

    if (filters.status && filters.status in EquipmentStatus) {
      where.status = filters.status as EquipmentStatus;
    }

    if (filters.manufacturer) {
      where.manufacturer = { contains: filters.manufacturer.trim(), mode: 'insensitive' };
    }

    if (filters.location) {
      where.location = { contains: filters.location.trim(), mode: 'insensitive' };
    }

    if (filters.tagId) {
      where.tags = { some: { tagId: filters.tagId } };
    }

    if (filters.commissionDateFrom || filters.commissionDateTo) {
      where.commissionDate = {};
      if (filters.commissionDateFrom) where.commissionDate.gte = new Date(filters.commissionDateFrom);
      if (filters.commissionDateTo) where.commissionDate.lte = new Date(filters.commissionDateTo);
    }

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { inventoryNumber: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
        { manufacturer: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sort && sort.field) {
      if (['name', 'inventoryNumber', 'serialNumber', 'manufacturer', 'model', 'location', 'status', 'commissionDate', 'createdAt'].includes(sort.field)) {
        orderBy = { [sort.field]: sort.order === 'asc' ? 'asc' : 'desc' };
      }
    }

    const items = await prisma.equipment.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        documents: { select: { id: true } },
        photos: { select: { id: true } },
        maintenancePlans: { select: { id: true } },
        spareParts: { select: { nomenclatureId: true } },
        createdBy: { select: { displayName: true } },
      },
      orderBy,
      take: limit && limit > 0 ? limit : undefined,
    });

    // Also get Jira issues count if needed
    const equipmentIds = items.map((i) => i.id);
    const jiraIssues = await prisma.jiraIssueCache.groupBy({
      by: ['equipmentId'],
      where: { equipmentId: { in: equipmentIds } },
      _count: { id: true },
    });
    const jiraCountMap = new Map<string, number>();
    jiraIssues.forEach((j) => {
      if (j.equipmentId) jiraCountMap.set(j.equipmentId, j._count.id);
    });

    // Format rows
    const rows = items.map((item) => {
      const customFields = (item.customFields as Record<string, any>) || {};
      const statusInfo = EQUIPMENT_STATUS_MAP[item.status] || { label: item.status };

      const row: Record<string, any> = {
        id: item.id,
        name: item.name,
        inventoryNumber: item.inventoryNumber || '—',
        serialNumber: item.serialNumber || '—',
        manufacturer: item.manufacturer || '—',
        model: item.model || '—',
        location: item.location || '—',
        status: statusInfo.label,
        criticality: customFields.criticality ? `Класс ${customFields.criticality}` : '—',
        actual_wear_percentage: customFields.actual_wear_percentage !== undefined && customFields.actual_wear_percentage !== '' ? `${customFields.actual_wear_percentage}%` : '—',
        equipment_group: customFields.equipment_group || '—',
        equipment_type: customFields.equipment_type || '—',
        responsible_person_name: customFields.responsible_person_name || '—',
        okof_code: customFields.okof_code || '—',
        okpd2_code: customFields.okpd2_code || '—',
        process_classifier_code: customFields.process_classifier_code || '—',
        maintenance_periodicity: customFields.maintenance_periodicity || '—',
        calibration_interval: customFields.calibration_interval ? `${customFields.calibration_interval} мес.` : '—',
        clean_room_class: customFields.clean_room_class || '—',
        is_critical_path: customFields.is_critical_path ? 'Да' : 'Нет',
        is_unique: customFields.is_unique ? 'Да' : 'Нет',
        is_imported: customFields.is_imported ? 'Да' : 'Нет',
        commissionDate: formatDate(item.commissionDate),
        commissionDateRaw: item.commissionDate ? item.commissionDate.toISOString() : null,
        tags: item.tags.map((t) => t.tag.name).join(', ') || '—',
        createdAt: formatDateTime(item.createdAt),
        createdBy: item.createdBy?.displayName || 'Система',
        documentsCount: item.documents.length,
        photosCount: item.photos.length,
        maintenancePlansCount: item.maintenancePlans.length,
        sparePartsCount: item.spareParts.length,
        jiraIssuesCount: jiraCountMap.get(item.id) || 0,
      };

      // Add custom fields
      customColumns.forEach((c) => {
        const rawKey = c.key.replace('custom_', '');
        const val = customFields[rawKey];
        if (val === undefined || val === null || val === '') {
          row[c.key] = '—';
        } else if (typeof val === 'boolean') {
          row[c.key] = val ? 'Да' : 'Нет';
        } else {
          row[c.key] = c.unit ? `${val} ${c.unit}` : String(val);
        }
      });

      return row;
    });

    return NextResponse.json({
      success: true,
      data: {
        total: rows.length,
        availableColumns: allAvailableColumns,
        selectedColumns: selectedColumns.length > 0 ? selectedColumns : baseColumns.map((c) => c.key),
        rows,
      },
    });
  } catch (error: unknown) {
    console.error('Ошибка формирования отчета EPS:', error);
    return NextResponse.json({ success: false, error: 'Ошибка формирования отчета' }, { status: 500 });
  }
}
