import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma, EquipmentStatus } from '@ems/database';
import { PERMISSIONS, EQUIPMENT_STATUS_MAP, formatDate, formatDateTime } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getEquipmentKind, getEquipmentDepartment, isTruthyBoolean, getEquipmentFieldValue } from '@/lib/eps-helpers';
import { buildEquipmentWhereInput } from '@/lib/eps-query-builder';

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

    // Лимит отчета: если не передан или null/0/undefined — выгружаем всю базу без искусственного ограничения (или с безопасным максимумом 100 000)
    let takeLimit: number | undefined = undefined;
    if (limit !== undefined && limit !== null && limit !== '' && Number(limit) > 0) {
      const parsed = Number(limit);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100000) {
        return NextResponse.json({ success: false, error: 'Лимит отчета должен быть от 1 до 100000' }, { status: 400 });
      }
      takeLimit = parsed;
    }

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

    // Build columns dictionary strictly from custom sections and fields (matching Equipment Registry)
    const reportColumns: { key: string; name: string; category: string; unit?: string | null; fieldType?: string }[] = [];
    const seenKeys = new Set<string>();

    sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        if (!seenKeys.has(f.key)) {
          seenKeys.add(f.key);
          reportColumns.push({
            key: f.key,
            name: f.unit ? `${f.name} (${f.unit})` : f.name,
            category: sec.name,
            unit: f.unit,
            fieldType: f.fieldType,
          });
        }
      });
    });

    unassignedFields.forEach((f) => {
      if (!seenKeys.has(f.key)) {
        seenKeys.add(f.key);
        reportColumns.push({
          key: f.key,
          name: f.unit ? `${f.name} (${f.unit})` : f.name,
          category: 'Дополнительные параметры',
          unit: f.unit,
          fieldType: f.fieldType,
        });
      }
    });

    // Дополнительные системные реквизиты (Аудит и Сводные связи)
    const systemColumns = [
      { key: 'status', name: 'Текущий статус', category: 'Системные реквизиты' },
      { key: 'tags', name: 'Теги / Метки', category: 'Системные реквизиты' },
      { key: 'createdAt', name: 'Дата регистрации', category: 'Системные реквизиты' },
      { key: 'createdBy', name: 'Паспорт зарегистрировал', category: 'Системные реквизиты' },
      { key: 'documentsCount', name: 'Документов (шт.)', category: 'Сводные данные' },
      { key: 'photosCount', name: 'Фотографий (шт.)', category: 'Сводные данные' },
      { key: 'maintenancePlansCount', name: 'Планов ТО и ППР (шт.)', category: 'Сводные данные' },
      { key: 'sparePartsCount', name: 'Запасных частей WMS (шт.)', category: 'Сводные данные' },
      { key: 'jiraIssuesCount', name: 'Заявок в Jira (шт.)', category: 'Сводные данные' },
    ];

    systemColumns.forEach((sc) => {
      if (!seenKeys.has(sc.key)) {
        seenKeys.add(sc.key);
        reportColumns.push(sc);
      }
    });

    const allAvailableColumns = reportColumns;

    // Build prisma query where filter via shared eps-query-builder
    const filterParams = new URLSearchParams();
    if (filters && typeof filters === 'object') {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          filterParams.set(key, String(val));
        }
      });
    }
    const where = buildEquipmentWhereInput(filterParams);

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
      ...(takeLimit ? { take: takeLimit } : {}),
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
      const statusInfo = EQUIPMENT_STATUS_MAP[item.status] || { label: item.status };

      const row: Record<string, any> = {
        id: item.id,
        status: statusInfo.label,
        tags: item.tags.map((t) => t.tag.name).join(', ') || '—',
        createdAt: formatDateTime(item.createdAt),
        createdBy: item.createdBy?.displayName || 'Система',
        documentsCount: item.documents.length,
        photosCount: item.photos.length,
        maintenancePlansCount: item.maintenancePlans.length,
        sparePartsCount: item.spareParts.length,
        jiraIssuesCount: jiraCountMap.get(item.id) || 0,
      };

      // Add fields mapped strictly according to passport specifications and values
      allAvailableColumns.forEach((c) => {
        if (row[c.key] !== undefined) return;
        const val = getEquipmentFieldValue(item, c.key);
        if (val === undefined || val === null || val === '' || val === '—') {
          row[c.key] = '—';
        } else if (c.key === 'criticality') {
          const str = String(val).replace(/^Класс\s*/i, '').trim();
          row[c.key] = str ? `Класс ${str}` : '—';
        } else if (c.fieldType === 'BOOLEAN' || c.key === 'is_unique' || c.key === 'is_imported' || c.key === 'is_critical_path') {
          row[c.key] = isTruthyBoolean(val) ? 'Да' : 'Нет';
        } else if (c.fieldType === 'DATE' || c.key === 'commissionDate' || c.key === 'commission_date') {
          row[c.key] = formatDate(val || item.commissionDate);
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
        selectedColumns: selectedColumns.length > 0 ? selectedColumns : allAvailableColumns.slice(0, 10).map((c) => c.key),
        rows,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Ошибка формирования отчета EPS:', message);
    return NextResponse.json({ success: false, error: 'Ошибка формирования отчета', details: message }, { status: 500 });
  }
}
