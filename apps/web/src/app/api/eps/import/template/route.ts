import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { enforceRateLimit } from '@/lib/rate-limit';
import { safeErrorResponse } from '@/lib/safe-error';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rateLimitRes = await enforceRateLimit(req, {
    limit: 30,
    windowMs: 60_000,
    prefix: 'eps:import:template',
  });
  if (rateLimitRes) return rateLimitRes;

  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.EPS_EQUIPMENT_VIEW) && !hasPermission(user, PERMISSIONS.EPS_IMPORT_EXECUTE)) {
      return forbiddenResponse();
    }

    // Fetch custom fields to include them in sample template
    const customFields = await prisma.customFieldDefinition.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const headers = [
      'Наименование оборудования *',
      'Инвентарный номер',
      'Заводской / Серийный номер',
      'Производитель',
      'Модель',
      'Место установки (Локация)',
      'Статус (В работе / На ремонте / На складе / Списано)',
      'Дата ввода в эксплуатацию (ГГГГ-ММ-ДД)',
      'Теги (через запятую)',
    ];

    // Add custom fields
    customFields.forEach((cf) => {
      headers.push(cf.unit ? `${cf.name} [${cf.unit}]` : cf.name);
    });

    // Sample data rows
    const sampleRow1 = [
      'Насос центробежный Д320-50',
      'INV-00892',
      'SN-2023-8891',
      'ГМС Ливгидромаш',
      'Д320-50',
      'Цех №2, Насосная станция',
      'В работе',
      '2023-05-15',
      'Насосы, Электрооборудование',
    ];

    const sampleRow2 = [
      'Токарно-винторезный станок 16К20',
      'INV-00893',
      'SN-1988-4412',
      'Красный пролетарий',
      '16К20',
      'Механический участок №1',
      'В работе',
      '2021-11-20',
      'Станки, Металлообработка',
    ];

    const sampleRow3 = [
      'Компрессор винтовой Airpol 55',
      'INV-00894',
      'SN-2022-7711',
      'Airpol',
      'Airpol 55',
      'Компрессорная станция',
      'На складе',
      '2022-08-10',
      'Компрессоры',
    ];

    // Fill sample values for custom fields
    customFields.forEach((cf) => {
      if (cf.fieldType === 'NUMBER') {
        sampleRow1.push('45');
        sampleRow2.push('11');
        sampleRow3.push('55');
      } else if (cf.fieldType === 'BOOLEAN') {
        sampleRow1.push('Да');
        sampleRow2.push('Нет');
        sampleRow3.push('Да');
      } else {
        sampleRow1.push(cf.defaultValue || 'Параметр 1');
        sampleRow2.push(cf.defaultValue || 'Параметр 2');
        sampleRow3.push(cf.defaultValue || 'Параметр 3');
      }
    });

    const worksheetData = [headers, sampleRow1, sampleRow2, sampleRow3];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const wscols = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Шаблон импорта оборудования');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="EPS_Equipment_Import_Template.xlsx"',
      },
    });
  } catch (error: unknown) {
    return safeErrorResponse(error, 'Ошибка формирования шаблона');
  }
}
