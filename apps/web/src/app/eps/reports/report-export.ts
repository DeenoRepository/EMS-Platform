import * as XLSX from 'xlsx';
import type { ReportColumn } from '@/components/eps/reports/ReportColumnBuilderDialog';

export type ReportRow = Record<string, any>;

export function exportReportExcel(rows: ReportRow[], columns: ReportColumn[], date = new Date()) {
  const headers = columns.map((column) => column.name);
  const exportData = rows.map((row) => columns.map((column) => row[column.key] ?? '—'));
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData]);
  worksheet['!cols'] = columns.map((column, index) => {
    const maxContentLength = Math.max(column.name.length, ...exportData.slice(0, 50).map((row) => String(row[index] || '').length));
    return { wch: Math.min(Math.max(maxContentLength + 3, 14), 50) };
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Отчет оборудования');
  const fileName = `EPS_Ведомость_${date.toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return fileName;
}

export function buildReportCsv(rows: ReportRow[], columns: ReportColumn[]) {
  const headers = columns.map((column) => `"${column.name.replace(/"/g, '""')}"`).join(';');
  const lines = rows.map((row) => columns.map((column) => `"${String(row[column.key] ?? '').replace(/"/g, '""')}"`).join(';'));
  return '\uFEFF' + [headers, ...lines].join('\r\n');
}

export function downloadReportFile(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildReportJson(rows: ReportRow[], columns: ReportColumn[]) {
  return JSON.stringify(rows.map((row) => Object.fromEntries(columns.map((column) => [column.name, row[column.key] ?? null]))), null, 2);
}
