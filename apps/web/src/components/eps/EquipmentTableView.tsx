'use client';

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Checkbox,
  Tooltip,
} from '@mui/material';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { StatusBadge } from '@/components/ui';
import { formatDate } from '@ems/shared';
import type { EquipmentRegistryItem } from './equipment-registry-model';

export const EPS_COLUMN_WIDTHS = {
  checkbox: 48,
  inventoryNumber: 140,
  name: 220,
  serialNumber: 180,
  manufacturer: 150,
  model: 150,
  location: 160,
  status: 130,
  criticality: 130,
  actualWear: 110,
  eqGroup: 130,
  eqType: 130,
  respPerson: 170,
  okofCode: 120,
  okpd2Code: 120,
  procCode: 130,
  maintPeriodicity: 160,
  calibrationInterval: 140,
  cleanRoom: 140,
  isCriticalPath: 150,
  isUnique: 120,
  isImported: 120,
  documentsCount: 120,
  sparePartsCount: 130,
  tags: 110,
  commissionDate: 140,
  updatedAt: 130,
  createdAt: 130,
} as const;

interface EquipmentTableViewProps {
  items: EquipmentRegistryItem[];
  visibleColumns: string[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  selectedIds: string[];
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelect: (id: string, event: React.MouseEvent) => void;
  onRowClick: (item: EquipmentRegistryItem) => void;
}

export const EquipmentTableView: React.FC<EquipmentTableViewProps> = ({
  items,
  visibleColumns,
  sortField,
  sortDirection,
  onSort,
  selectedIds,
  onToggleSelectAll,
  onToggleSelect,
  onRowClick,
}) => {
  const allSelected = items.length > 0 && items.every((i) => selectedIds.includes(i.id));
  const someSelected = items.some((i) => selectedIds.includes(i.id)) && !allSelected;

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell padding="checkbox" sx={{ width: EPS_COLUMN_WIDTHS.checkbox }}>
            <Checkbox
              size="small"
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(e) => onToggleSelectAll(e.target.checked)}
              inputProps={{ 'aria-label': 'Выбрать все записи' }}
            />
          </TableCell>

          {visibleColumns.includes('inventoryNumber') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.inventoryNumber }}>
              <TableSortLabel
                active={sortField === 'inventoryNumber'}
                direction={sortField === 'inventoryNumber' ? sortDirection : 'asc'}
                onClick={() => onSort('inventoryNumber')}
              >
                Инв. номер
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('name') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.name }}>
              <TableSortLabel
                active={sortField === 'name'}
                direction={sortField === 'name' ? sortDirection : 'asc'}
                onClick={() => onSort('name')}
              >
                Наименование оборудования
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('serialNumber') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.serialNumber }}>
              <TableSortLabel
                active={sortField === 'serialNumber'}
                direction={sortField === 'serialNumber' ? sortDirection : 'asc'}
                onClick={() => onSort('serialNumber')}
              >
                Заводской / серийный №
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('manufacturer') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.manufacturer }}>
              <TableSortLabel
                active={sortField === 'manufacturer'}
                direction={sortField === 'manufacturer' ? sortDirection : 'asc'}
                onClick={() => onSort('manufacturer')}
              >
                Производитель
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('model') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.model }}>
              <TableSortLabel
                active={sortField === 'model'}
                direction={sortField === 'model' ? sortDirection : 'asc'}
                onClick={() => onSort('model')}
              >
                Модель / марка
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('location') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.location }}>
              <TableSortLabel
                active={sortField === 'location'}
                direction={sortField === 'location' ? sortDirection : 'asc'}
                onClick={() => onSort('location')}
              >
                Локация / место
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('status') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.status }}>
              <TableSortLabel
                active={sortField === 'status'}
                direction={sortField === 'status' ? sortDirection : 'asc'}
                onClick={() => onSort('status')}
              >
                Статус
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('criticality') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.criticality }}>
              <TableSortLabel
                active={sortField === 'criticality'}
                direction={sortField === 'criticality' ? sortDirection : 'asc'}
                onClick={() => onSort('criticality')}
              >
                Критичность
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('actualWear') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.actualWear }}>
              <TableSortLabel
                active={sortField === 'actualWear'}
                direction={sortField === 'actualWear' ? sortDirection : 'asc'}
                onClick={() => onSort('actualWear')}
              >
                Износ (%)
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('eqGroup') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.eqGroup }}>
              <TableSortLabel
                active={sortField === 'eqGroup'}
                direction={sortField === 'eqGroup' ? sortDirection : 'asc'}
                onClick={() => onSort('eqGroup')}
              >
                Группа
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('eqType') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.eqType }}>
              <TableSortLabel
                active={sortField === 'eqType'}
                direction={sortField === 'eqType' ? sortDirection : 'asc'}
                onClick={() => onSort('eqType')}
              >
                Вид
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('respPerson') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.respPerson }}>
              <TableSortLabel
                active={sortField === 'respPerson'}
                direction={sortField === 'respPerson' ? sortDirection : 'asc'}
                onClick={() => onSort('respPerson')}
              >
                Ответственный (МОЛ)
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('okofCode') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.okofCode }}>
              <TableSortLabel
                active={sortField === 'okofCode'}
                direction={sortField === 'okofCode' ? sortDirection : 'asc'}
                onClick={() => onSort('okofCode')}
              >
                Код ОКОФ
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('okpd2Code') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.okpd2Code }}>
              <TableSortLabel
                active={sortField === 'okpd2Code'}
                direction={sortField === 'okpd2Code' ? sortDirection : 'asc'}
                onClick={() => onSort('okpd2Code')}
              >
                Код ОКПД2
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('procCode') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.procCode }}>
              <TableSortLabel
                active={sortField === 'procCode'}
                direction={sortField === 'procCode' ? sortDirection : 'asc'}
                onClick={() => onSort('procCode')}
              >
                Техпроцесс
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('maintPeriodicity') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.maintPeriodicity }}>
              <TableSortLabel
                active={sortField === 'maintPeriodicity'}
                direction={sortField === 'maintPeriodicity' ? sortDirection : 'asc'}
                onClick={() => onSort('maintPeriodicity')}
              >
                Периодичность ТО
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('calibrationInterval') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.calibrationInterval }}>
              <TableSortLabel
                active={sortField === 'calibrationInterval'}
                direction={sortField === 'calibrationInterval' ? sortDirection : 'asc'}
                onClick={() => onSort('calibrationInterval')}
              >
                Поверка (мес.)
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('cleanRoom') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.cleanRoom }}>
              <TableSortLabel
                active={sortField === 'cleanRoom'}
                direction={sortField === 'cleanRoom' ? sortDirection : 'asc'}
                onClick={() => onSort('cleanRoom')}
              >
                Класс чистоты
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('isCriticalPath') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.isCriticalPath }}>
              <TableSortLabel
                active={sortField === 'isCriticalPath'}
                direction={sortField === 'isCriticalPath' ? sortDirection : 'asc'}
                onClick={() => onSort('isCriticalPath')}
              >
                Критический путь
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('isUnique') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.isUnique }}>
              <TableSortLabel
                active={sortField === 'isUnique'}
                direction={sortField === 'isUnique' ? sortDirection : 'asc'}
                onClick={() => onSort('isUnique')}
              >
                Уникальное
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('isImported') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.isImported }}>
              <TableSortLabel
                active={sortField === 'isImported'}
                direction={sortField === 'isImported' ? sortDirection : 'asc'}
                onClick={() => onSort('isImported')}
              >
                Импортное
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('documentsCount') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.documentsCount }}>
              <TableSortLabel
                active={sortField === 'documentsCount'}
                direction={sortField === 'documentsCount' ? sortDirection : 'asc'}
                onClick={() => onSort('documentsCount')}
              >
                Документы
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('sparePartsCount') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.sparePartsCount }}>
              <TableSortLabel
                active={sortField === 'sparePartsCount'}
                direction={sortField === 'sparePartsCount' ? sortDirection : 'asc'}
                onClick={() => onSort('sparePartsCount')}
              >
                ЗИП / детали
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('tags') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.tags }}>
              <TableSortLabel
                active={sortField === 'tags'}
                direction={sortField === 'tags' ? sortDirection : 'asc'}
                onClick={() => onSort('tags')}
              >
                Теги
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('commissionDate') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.commissionDate }}>
              <TableSortLabel
                active={sortField === 'commissionDate'}
                direction={sortField === 'commissionDate' ? sortDirection : 'asc'}
                onClick={() => onSort('commissionDate')}
              >
                Ввод в экспл.
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('updatedAt') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.updatedAt }}>
              <TableSortLabel
                active={sortField === 'updatedAt'}
                direction={sortField === 'updatedAt' ? sortDirection : 'asc'}
                onClick={() => onSort('updatedAt')}
              >
                Обновлено
              </TableSortLabel>
            </TableCell>
          )}

          {visibleColumns.includes('createdAt') && (
            <TableCell sx={{ minWidth: EPS_COLUMN_WIDTHS.createdAt }}>
              <TableSortLabel
                active={sortField === 'createdAt'}
                direction={sortField === 'createdAt' ? sortDirection : 'asc'}
                onClick={() => onSort('createdAt')}
              >
                Создано
              </TableSortLabel>
            </TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((eq) => {
          const isChecked = selectedIds.includes(eq.id);
          const custom = eq.customFields || {};

          return (
            <TableRow
              key={eq.id}
              hover
              selected={isChecked}
              onClick={() => onRowClick(eq)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell padding="checkbox" onClick={(e) => onToggleSelect(eq.id, e)}>
                <Checkbox size="small" checked={isChecked} />
              </TableCell>

              {visibleColumns.includes('inventoryNumber') && (
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8125rem' }}>
                  {eq.inventoryNumber || '—'}
                </TableCell>
              )}

              {visibleColumns.includes('name') && (
                <TableCell sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PrecisionManufacturingIcon sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{eq.name}</Typography>
                  </Box>
                </TableCell>
              )}

              {visibleColumns.includes('serialNumber') && (
                <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.8125rem' }}>
                  {eq.serialNumber || '—'}
                </TableCell>
              )}

              {visibleColumns.includes('manufacturer') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>{eq.manufacturer || '—'}</TableCell>
              )}

              {visibleColumns.includes('model') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>{eq.model || '—'}</TableCell>
              )}

              {visibleColumns.includes('location') && (
                <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{eq.location || '—'}</TableCell>
              )}

              {visibleColumns.includes('status') && (
                <TableCell>
                  <StatusBadge status={eq.status} />
                </TableCell>
              )}

              {visibleColumns.includes('criticality') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>{String(custom.criticality || '—')}</TableCell>
              )}

              {visibleColumns.includes('actualWear') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>
                  {custom.actual_wear_percentage ? `${custom.actual_wear_percentage}%` : '—'}
                </TableCell>
              )}

              {visibleColumns.includes('eqGroup') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>{String(custom.equipment_group || '—')}</TableCell>
              )}

              {visibleColumns.includes('eqType') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>{String(custom.equipment_type || '—')}</TableCell>
              )}

              {visibleColumns.includes('respPerson') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>{String(custom.responsible_person_name || '—')}</TableCell>
              )}

              {visibleColumns.includes('okofCode') && (
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{String(custom.okof_code || '—')}</TableCell>
              )}

              {visibleColumns.includes('okpd2Code') && (
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{String(custom.okpd2_code || '—')}</TableCell>
              )}

              {visibleColumns.includes('procCode') && (
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{String(custom.process_classifier_code || '—')}</TableCell>
              )}

              {visibleColumns.includes('maintPeriodicity') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>{String(custom.maintenance_periodicity || '—')}</TableCell>
              )}

              {visibleColumns.includes('calibrationInterval') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>
                  {custom.calibration_interval ? `${custom.calibration_interval} мес.` : '—'}
                </TableCell>
              )}

              {visibleColumns.includes('cleanRoom') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>{String(custom.clean_room_class || '—')}</TableCell>
              )}

              {visibleColumns.includes('isCriticalPath') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>{custom.is_critical_path ? 'Да' : 'Нет'}</TableCell>
              )}

              {visibleColumns.includes('isUnique') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>{custom.is_unique ? 'Да' : 'Нет'}</TableCell>
              )}

              {visibleColumns.includes('isImported') && (
                <TableCell sx={{ fontSize: '0.8125rem' }}>{custom.is_imported ? 'Да' : 'Нет'}</TableCell>
              )}

              {visibleColumns.includes('documentsCount') && (
                <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                  {eq._count?.documents ?? eq.counts?.documents ?? 0}
                </TableCell>
              )}

              {visibleColumns.includes('sparePartsCount') && (
                <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                  {eq._count?.spareParts ?? eq.counts?.spareParts ?? 0}
                </TableCell>
              )}

              {visibleColumns.includes('tags') && (
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {eq.tags && eq.tags.length > 0 ? (
                      eq.tags.map((t) => (
                        <Chip
                          key={t.id}
                          label={t.name}
                          size="small"
                          sx={{
                            fontSize: '0.6875rem',
                            height: 22,
                            backgroundColor: 'background.paper',
                            color: 'text.secondary',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: '4px',
                            fontWeight: 500,
                          }}
                        />
                      ))
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>—</Typography>
                    )}
                  </Box>
                </TableCell>
              )}

              {visibleColumns.includes('commissionDate') && (
                <TableCell sx={{ fontSize: '0.8125rem', color: 'text.disabled', fontFeatureSettings: '"tnum"' }}>
                  {formatDate(eq.commissionDate)}
                </TableCell>
              )}

              {visibleColumns.includes('updatedAt') && (
                <TableCell sx={{ fontSize: '0.8125rem', color: 'text.disabled', fontFeatureSettings: '"tnum"' }}>
                  {formatDate(eq.updatedAt)}
                </TableCell>
              )}

              {visibleColumns.includes('createdAt') && (
                <TableCell sx={{ fontSize: '0.8125rem', color: 'text.disabled', fontFeatureSettings: '"tnum"' }}>
                  {formatDate(eq.createdAt)}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
