'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  TableContainer,
  Paper,
  Box,
  LinearProgress,
  TablePagination,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Button,
  Menu,
  MenuItem,
  Checkbox,
  Divider,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import CloseIcon from '@mui/icons-material/Close';
import ViewWeekOutlinedIcon from '@mui/icons-material/ViewWeekOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import { TableDensity, DensityToggle } from './DataTableDensityToggle';
import { TableColumnOption, ColumnSelector } from './DataTableColumnSelector';

export type { TableDensity, TableColumnOption };

export interface DataTableWrapperProps {
  children?: React.ReactNode;
  /** Встроенные навигационные вкладки в шапке реестра/таблицы */
  tabs?: React.ReactNode;
  /** Встроенный слот тулбара поиска и фильтров в шапке таблицы */
  toolbar?: React.ReactNode;
  /** Заголовок таблицы/реестра */
  title?: React.ReactNode;
  /** Подзаголовок или пояснение */
  subtitle?: React.ReactNode;
  /** Дополнительные действия в шапке */
  headerActions?: React.ReactNode;
  /** Индикатор загрузки данных */
  loading?: boolean;
  /** Флаг пустого состояния (нет данных) */
  empty?: boolean;
  /** Компонент пустого состояния, отображаемый внутри таблицы под тулбаром */
  emptyState?: React.ReactNode;
  /** Режим отображения: таблица или сетка карточек */
  viewMode?: 'table' | 'grid';
  /** Обработчик переключения режима отображения */
  onViewModeChange?: (mode: 'table' | 'grid') => void;
  /** Содержимое для режима сетки (карточек) */
  gridContent?: React.ReactNode;
  /** Плотность строк таблицы */
  density?: TableDensity;
  /** Обработчик изменения плотности */
  onDensityChange?: (density: TableDensity) => void;
  /** Показывать переключатель плотности */
  showDensityToggle?: boolean;
  /** Ключ для автоматического сохранения выбранных колонок и плотности в localStorage */
  storageKey?: string;
  /** Список доступных колонок для настройки видимости */
  columns?: TableColumnOption[];
  /** Массив ID видимых колонок */
  visibleColumns?: string[];
  /** Обработчик изменения видимости колонок */
  onVisibleColumnsChange?: (columns: string[]) => void;
  /** Функция обновления данных */
  onRefresh?: () => void;
  /** Флаг состояния обновления */
  refreshing?: boolean;
  /** Количество выбранных элементов */
  selectedCount?: number;
  /** Сброс выбора */
  onClearSelection?: () => void;
  /** Дополнительные контролы в подвале (слева от пагинации) */
  footerActions?: React.ReactNode;
  /** Пагинация */
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (event: unknown, newPage: number) => void;
  onPageSizeChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  pageSizeOptions?: number[];
  /** Фиксированная шапка таблицы */
  stickyHeader?: boolean;
  maxHeight?: number | string;
  className?: string;
}

const DENSITY_STYLES = {
  compact: {
    '& .MuiTableCell-root': {
      py: 0.6,
      px: 1.25,
      fontSize: '0.75rem',
    },
    '& .MuiTableCell-head': {
      py: 0.75,
      px: 1.25,
      fontSize: '0.75rem',
      whiteSpace: 'nowrap',
      fontWeight: 600,
    },
  },
  standard: {
    '& .MuiTableCell-root': {
      py: 1.1,
      px: 1.75,
      fontSize: '0.8125rem',
    },
    '& .MuiTableCell-head': {
      py: 1,
      px: 1.75,
      fontSize: '0.75rem',
      whiteSpace: 'nowrap',
      fontWeight: 600,
    },
  },
  comfortable: {
    '& .MuiTableCell-root': {
      py: 1.6,
      px: 2,
      fontSize: '0.875rem',
    },
    '& .MuiTableCell-head': {
      py: 1.25,
      px: 2,
      fontSize: '0.8125rem',
      whiteSpace: 'nowrap',
      fontWeight: 600,
    },
  },
};


interface SelectionBannerProps {
  count: number;
  total?: number;
  onClear?: () => void;
}

function SelectionBanner({ count, total, onClear }: SelectionBannerProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'success.light',
        borderBottom: '1px solid',
        borderColor: 'success.light',
        px: 2,
        py: 0.75,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={`Выбрано: ${count}`}
          size="small"
          sx={{ fontWeight: 700, height: 22, backgroundColor: 'success.dark', color: 'common.white' }}
        />
        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'success.dark', fontWeight: 500 }}>
          {total ? `из ${total} записей` : ''}
        </Typography>
      </Box>

      {onClear && (
        <Button
          size="small"
          variant="text"
          color="inherit"
          startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
          onClick={onClear}
          sx={{ fontSize: '0.75rem', fontWeight: 600, py: 0.2, color: 'success.dark' }}
        >
          Снять выделение
        </Button>
      )}
    </Box>
  );
}

export function DataTableWrapper({
  children,
  tabs,
  toolbar,
  title,
  subtitle,
  headerActions,
  loading = false,
  empty = false,
  emptyState,
  viewMode = 'table',
  gridContent,
  density: controlledDensity,
  onDensityChange,
  showDensityToggle = false,
  storageKey,
  columns,
  visibleColumns: controlledVisibleColumns,
  onVisibleColumnsChange,
  selectedCount = 0,
  onClearSelection,
  footerActions,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  maxHeight,
  className,
}: DataTableWrapperProps) {
  const [internalDensity, setInternalDensity] = useState<TableDensity>('standard');
  const currentDensity = controlledDensity !== undefined ? controlledDensity : internalDensity;

  const [internalVisibleColumns, setInternalVisibleColumns] = useState<string[]>(() => {
    if (columns) {
      return columns.filter((c) => c.defaultVisible !== false).map((c) => c.id);
    }
    return [];
  });

  const currentVisibleColumns = controlledVisibleColumns !== undefined ? controlledVisibleColumns : internalVisibleColumns;

  const computedStorageKey = storageKey || (
    columns && columns.length > 0
      ? `auto_${columns.map((c) => c.id).slice(0, 3).join('_')}_len${columns.length}`
      : undefined
  );

  const onVisibleColumnsChangeRef = useRef(onVisibleColumnsChange);
  useEffect(() => {
    onVisibleColumnsChangeRef.current = onVisibleColumnsChange;
  });

  const onDensityChangeRef = useRef(onDensityChange);
  useEffect(() => {
    onDensityChangeRef.current = onDensityChange;
  });

  useEffect(() => {
    if (!computedStorageKey || typeof window === 'undefined') return;
    try {
      const savedColsRaw = localStorage.getItem(`ems_cols_${computedStorageKey}`);
      if (savedColsRaw) {
        const savedCols: string[] = JSON.parse(savedColsRaw);
        if (Array.isArray(savedCols) && savedCols.length > 0) {
          const validCols = columns
            ? savedCols.filter((id) => columns.some((c) => c.id === id))
            : savedCols;
          if (validCols.length > 0) {
            setInternalVisibleColumns(validCols);
            onVisibleColumnsChangeRef.current?.(validCols);
          }
        }
      }

      const savedDensity = localStorage.getItem(`ems_density_${computedStorageKey}`) as TableDensity | null;
      if (savedDensity && ['compact', 'standard', 'comfortable'].includes(savedDensity)) {
        setInternalDensity(savedDensity);
        onDensityChangeRef.current?.(savedDensity);
      }
    } catch {
      // localStorage is an optional persistence layer; defaults remain in use when it is unavailable or contains invalid data.
    }
  }, [columns, computedStorageKey]);

  const persistColumns = (cols: string[]) => {
    if (!computedStorageKey || typeof window === 'undefined') return;
    try {
      localStorage.setItem(`ems_cols_${computedStorageKey}`, JSON.stringify(cols));
    } catch {
      // localStorage is an optional persistence layer; the current selection remains active for this session.
    }
  };

  const handleToggleColumn = (colId: string) => {
    const isCurrentlyVisible = currentVisibleColumns.includes(colId);
    if (isCurrentlyVisible && currentVisibleColumns.length === 1) return;

    const updated = isCurrentlyVisible
      ? currentVisibleColumns.filter((id) => id !== colId)
      : [...currentVisibleColumns, colId];

    persistColumns(updated);
    if (onVisibleColumnsChange) {
      onVisibleColumnsChange(updated);
    } else {
      setInternalVisibleColumns(updated);
    }
  };

  const handleSelectAllColumns = () => {
    if (!columns) return;
    const all = columns.map((c) => c.id);
    persistColumns(all);
    if (onVisibleColumnsChange) {
      onVisibleColumnsChange(all);
    } else {
      setInternalVisibleColumns(all);
    }
  };

  const handleResetColumns = () => {
    if (!columns) return;
    const defaultCols = columns.filter((c) => c.defaultVisible !== false).map((c) => c.id);
    if (computedStorageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`ems_cols_${computedStorageKey}`);
      } catch (e) {}
    }
    if (onVisibleColumnsChange) {
      onVisibleColumnsChange(defaultCols);
    } else {
      setInternalVisibleColumns(defaultCols);
    }
  };

  const handleDensityChange = (newDensity: TableDensity) => {
    if (computedStorageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`ems_density_${computedStorageKey}`, newDensity);
      } catch (e) {}
    }
    if (onDensityChange) {
      onDensityChange(newDensity);
    } else {
      setInternalDensity(newDensity);
    }
  };

  const showPagination =
    total !== undefined &&
    page !== undefined &&
    pageSize !== undefined &&
    Boolean(onPageChange) &&
    !empty;

  const utilityTools = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {showDensityToggle && (
        <DensityToggle currentDensity={currentDensity} onChange={handleDensityChange} />
      )}

      {columns && columns.length > 0 && (
        <ColumnSelector
          columns={columns}
          visibleColumns={currentVisibleColumns}
          onToggle={handleToggleColumn}
          onSelectAll={handleSelectAllColumns}
          onReset={handleResetColumns}
        />
      )}

      {headerActions}
    </Box>
  );

  const hasHeader = Boolean(title || subtitle);

  return (
    <Paper
      elevation={0}
      className={className}
      sx={{
        width: '100%',
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {tabs && (
        <Box
          sx={{
            px: { xs: 1, sm: 1.5 },
            backgroundColor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          {tabs}
        </Box>
      )}

      {hasHeader && (
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            backgroundColor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ letterSpacing: '-0.01em' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', display: 'block', mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {utilityTools}
        </Box>
      )}

      {toolbar && (
        <Box
          sx={{
            p: { xs: 1.25, sm: 1.5 },
            backgroundColor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>{toolbar}</Box>
          {!hasHeader && utilityTools}
        </Box>
      )}

      {!hasHeader && !toolbar && (showDensityToggle || columns || headerActions) && (
        <Box
          sx={{
            p: 1.25,
            backgroundColor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {utilityTools}
        </Box>
      )}

      {selectedCount > 0 && (
        <SelectionBanner count={selectedCount} total={total} onClear={onClearSelection} />
      )}

      {loading && <LinearProgress color="primary" sx={{ height: 2 }} />}

      {empty && emptyState ? (
        <Box sx={{ p: { xs: 2, sm: 4 }, display: 'flex', justifyContent: 'center' }}>
          {emptyState}
        </Box>
      ) : viewMode === 'grid' && gridContent ? (
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, flexGrow: 1, backgroundColor: 'background.default' }}>
          {gridContent}
        </Box>
      ) : (
        <TableContainer
          sx={{
            maxHeight: maxHeight || 'none',
            '&::-webkit-scrollbar': { height: 6, width: 6 },
            '&::-webkit-scrollbar-track': { backgroundColor: 'background.default' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 3 },
            ...DENSITY_STYLES[currentDensity],
          }}
        >
          {children}
        </TableContainer>
      )}

      {(showPagination || footerActions) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            px: 1.5,
            py: 0.5,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{footerActions}</Box>

          {showPagination && (
            <TablePagination
              component="div"
              count={total!}
              page={page!}
              rowsPerPage={pageSize!}
              onPageChange={onPageChange!}
              onRowsPerPageChange={onPageSizeChange}
              rowsPerPageOptions={pageSizeOptions}
              labelRowsPerPage="Строк на странице:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} из ${count !== -1 ? count : `более ${to}`}`
              }
              sx={{
                ml: 'auto',
                fontSize: '0.75rem',
                border: 'none',
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  fontWeight: 500,
                },
                '& .MuiTablePagination-select': {
                  fontSize: '0.75rem',
                  fontWeight: 600,
                },
                '& .MuiTablePagination-toolbar': {
                  minHeight: 48,
                  p: 0,
                },
              }}
            />
          )}
        </Box>
      )}
    </Paper>
  );
}

export default DataTableWrapper;
