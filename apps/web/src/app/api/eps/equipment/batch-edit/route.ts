import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission, logAuditEvent } from '@ems/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { buildEquipmentWhereInput } from '@/lib/eps-query-builder';
import {
  BATCH_EDIT_COLUMNS,
  getEquipmentColumnValue,
  computeReplacement,
  extractDistinctColumnValues,
  prepareEquipmentFieldUpdate,
} from '@/lib/eps-batch-edit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

function canPerformBatchEdit(user: any): boolean {
  if (!user) return false;
  if (user.roles?.includes('admin') || user.roles?.includes('administrator')) return true;
  return hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_BATCH_EDIT);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!canPerformBatchEdit(user)) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const field = searchParams.get('field') || '';
    const search = searchParams.get('search') || '';

    const validCol = BATCH_EDIT_COLUMNS.find((c) => c.id === field);
    if (!validCol) {
      return NextResponse.json(
        { success: false, error: 'Указана недопустимая колонка' },
        { status: 400 }
      );
    }

    const items = await prisma.equipment.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        manufacturer: true,
        model: true,
        location: true,
        status: true,
        customFields: true,
      },
      take: 2000,
    });

    const values = extractDistinctColumnValues(items as any, field, search);
    return NextResponse.json({
      success: true,
      field,
      values,
      totalDistinct: values.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка получения значений колонки', details: message },
      { status: 500 }
    );
  }
}

const batchEditSchema = z.object({
  action: z.enum(['preview', 'apply']).default('preview'),
  field: z.string().min(1),
  matchMode: z.enum(['EXACT', 'CONTAINS']).default('EXACT'),
  findValue: z.string().min(1),
  replaceValue: z.string(),
  scope: z.enum(['ALL', 'FILTERED', 'SELECTED']).default('ALL'),
  selectedIds: z.array(z.string()).optional(),
  filterParams: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, {
    limit: 30,
    windowMs: 60 * 1000,
    prefix: 'eps-batch-edit',
  });
  if (rateLimitError) return rateLimitError;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!canPerformBatchEdit(user)) return forbiddenResponse();

    const body = await req.json();
    const parsed = batchEditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Неверные параметры запроса', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { action, field, matchMode, findValue, replaceValue, scope, selectedIds, filterParams } =
      parsed.data;

    if (scope === 'SELECTED' && (!selectedIds || selectedIds.length === 0)) {
      return NextResponse.json({ success: false, error: 'Для выбранных позиций требуется непустой список ID' }, { status: 400 });
    }
    if (scope === 'FILTERED' && !filterParams) {
      return NextResponse.json({ success: false, error: 'Для отфильтрованных позиций требуется набор фильтров' }, { status: 400 });
    }

    const columnConfig = BATCH_EDIT_COLUMNS.find((c) => c.id === field);
    if (!columnConfig) {
      return NextResponse.json(
        { success: false, error: 'Редактирование выбранной колонки не поддерживается' },
        { status: 400 }
      );
    }

    const where = buildScopeWhere(scope, selectedIds, filterParams);
    const candidates = await prisma.equipment.findMany({
      where,
      select: {
        id: true,
        name: true,
        inventoryNumber: true,
        manufacturer: true,
        model: true,
        location: true,
        status: true,
        customFields: true,
      },
    });

    const matches = processReplacements(candidates as any, field, findValue, replaceValue, matchMode);

    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        matchedCount: matches.length,
        sampleItems: matches.slice(0, 15).map((m) => ({
          id: m.id,
          name: m.name,
          inventoryNumber: m.inventoryNumber,
          oldValue: m.oldValue,
          newValue: m.newValue,
        })),
      });
    }

    return await executeBatchApplication(matches, user, {
      field,
      matchMode,
      findValue,
      replaceValue,
      scope,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка выполнения массового редактирования', details: message },
      { status: 500 }
    );
  }
}

function buildScopeWhere(
  scope: 'ALL' | 'FILTERED' | 'SELECTED',
  selectedIds?: string[],
  filterParams?: Record<string, string>
) {
  if (scope === 'SELECTED' && Array.isArray(selectedIds) && selectedIds.length > 0) {
    return { id: { in: selectedIds }, deletedAt: null };
  }
  if (scope === 'FILTERED' && filterParams) {
    const searchParams = new URLSearchParams(filterParams);
    return buildEquipmentWhereInput(searchParams);
  }
  return { deletedAt: null };
}

function processReplacements(
  items: any[],
  field: string,
  findValue: string,
  replaceValue: string,
  matchMode: 'EXACT' | 'CONTAINS'
) {
  const result: any[] = [];
  for (const item of items) {
    const currentVal = getEquipmentColumnValue(item, field);
    const { matched, newValue } = computeReplacement(
      currentVal,
      findValue,
      replaceValue,
      matchMode
    );

    if (matched && newValue !== currentVal) {
      const updateData = prepareEquipmentFieldUpdate(
        field,
        newValue,
        item.customFields as Record<string, any>
      );
      result.push({
        id: item.id,
        name: item.name,
        inventoryNumber: item.inventoryNumber,
        oldValue: currentVal,
        newValue,
        updateData,
      });
    }
  }
  return result;
}

async function executeBatchApplication(
  matches: any[],
  user: any,
  meta: {
    field: string;
    matchMode: string;
    findValue: string;
    replaceValue: string;
    scope: string;
  }
) {
  if (matches.length === 0) {
    return NextResponse.json({
      success: true,
      updatedCount: 0,
      message: 'Не найдено совпадений для замены',
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const item of matches) {
      await tx.equipment.update({
        where: { id: item.id },
        data: {
          ...item.updateData.directData,
          customFields:
            item.updateData.customFields !== undefined
              ? item.updateData.customFields
              : undefined,
        },
      });
    }

    await logAuditEvent({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'EquipmentBatchEdit',
      entityId: meta.field,
      changes: {
        ...meta,
        updatedCount: matches.length,
        affectedIds: matches.map((m) => m.id).slice(0, 500),
      },
    });
  });

  return NextResponse.json({
    success: true,
    updatedCount: matches.length,
    message: `Успешно обновлено позиций оборудования: ${matches.length}`,
  });
}
