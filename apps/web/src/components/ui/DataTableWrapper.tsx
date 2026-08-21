'use client';

import React, { useState } from 'react';
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
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import CloseIcon from '@mui/icons-material/Close';

export type TableDensity = 'compact' | 'standard' | 'comfortable';

export interface TableColumnOption {
  id: string;
  label: string;
  defaultVisible?: boolean;
  required?: boolean;
}

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

import ViewWeekOutlinedIcon from '@mui/icons-material/ViewWeekOutlined';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import CheckBoxOutlineBlankOutlinedIcon from '@mui/icons-material/CheckBoxOutlineBlankOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';

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
  onViewModeChange,
  gridContent,
  density: controlledDensity,
  onDensityChange,
  showDensityToggle = false,
  columns,
  visibleColumns: controlledVisibleColumns,
  onVisibleColumnsChange,
  onRefresh,
  refreshing = false,
  selectedCount = 0,
  onClearSelection,
  footerActions,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  stickyHeader = false,
  maxHeight,
  className,
}: DataTableWrapperProps) {
  const [internalDensity, setInternalDensity] = useState<TableDensity>('standard');
  const currentDensity = controlledDensity !== undefined ? controlledDensity : internalDensity;

  // Column Selector state
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);
  const isColumnMenuOpen = Boolean(columnMenuAnchor);

  // Default visible columns if not controlled
  const [internalVisibleColumns, setInternalVisibleColumns] = useState<string[]>(() => {
    if (columns) {
      return columns.filter((c) => c.defaultVisible !== false).map((c) => c.id);
    }
    return [];
  });

  const currentVisibleColumns = controlledVisibleColumns !== undefined ? controlledVisibleColumns : internalVisibleColumns;

  const handleToggleColumn = (colId: string) => {
    const isCurrentlyVisible = currentVisibleColumns.includes(colId);
    if (isCurrentlyVisible && currentVisibleColumns.length === 1) return;

    const updated = isCurrentlyVisible
      ? currentVisibleColumns.filter((id) => id !== colId)
      : [...currentVisibleColumns, colId];

    if (onVisibleColumnsChange) {
      onVisibleColumnsChange(updated);
    } else {
      setInternalVisibleColumns(updated);
    }
  };

  const handleSelectAllColumns = () => {
    if (!columns) return;
    const all = columns.map((c) => c.id);
    if (onVisibleColumnsChange) {
      onVisibleColumnsChange(all);
    } else {
      setInternalVisibleColumns(all);
    }
  };

  const handleResetColumns = () => {
    if (!columns) return;
    const defaultCols = columns.filter((c) => c.defaultVisible !== false).map((c) => c.id);
    if (onVisibleColumnsChange) {
      onVisibleColumnsChange(defaultCols);
    } else {
      setInternalVisibleColumns(defaultCols);
    }
  };

  const handleDensityChange = (newDensity: TableDensity) => {
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

  // Density styles for table cells
  const densityStyles = {
    compact: {
      '& .MuiTableCell-root': {
        py: 0.6,
        px: 1.25,
        fontSize: '0.75rem',
      },
      '& .MuiTableCell-head': {
        py: 0.8,
        px: 1.25,
        fontSize: '0.6875rem',
      },
    },
    standard: {
      '& .MuiTableCell-root': {
        py: 1.1,
        px: 1.75,
        fontSize: '0.8125rem',
      },
      '& .MuiTableCell-head': {
        py: 1.25,
        px: 1.75,
        fontSize: '0.6875rem',
      },
    },
    comfortable: {
      '& .MuiTableCell-root': {
        py: 1.6,
        px: 2,
        fontSize: '0.875rem',
      },
      '& .MuiTableCell-head': {
        py: 1.5,
        px: 2,
        fontSize: '0.75rem',
      },
    },
  };

  const renderHeaderRight = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Density Selector */}
      {showDensityToggle && (
        <Tooltip title="Плотность строк">
          <Box sx={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '8px', p: 0.25, bgcolor: '#ffffff' }}>
            <IconButton
              size="small"
              onClick={() => handleDensityChange('compact')}
              sx={{
                p: 0.5,
                borderRadius: '6px',
                color: currentDensity === 'compact' ? '#0284c7' : '#64748b',
                backgroundColor: currentDensity === 'compact' ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
              }}
            >
              <ViewListIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDensityChange('standard')}
              sx={{
                p: 0.5,
                borderRadius: '6px',
                color: currentDensity === 'standard' ? '#0284c7' : '#64748b',
                backgroundColor: currentDensity === 'standard' ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
              }}
            >
              <ViewModuleIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Tooltip>
      )}

      {/* Column Selector Button & Dropdown */}
      {columns && columns.length > 0 && (
        <>
          <Tooltip title="Настройка видимости колонок">
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
              startIcon={<ViewWeekOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{
                height: 36,
                borderRadius: '8px',
                borderColor: '#e2e8f0',
                color: '#475569',
                backgroundColor: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#cbd5e1',
                  backgroundColor: '#f8fafc',
                },
              }}
            >
              Колонки {currentVisibleColumns.length < columns.length && `(${currentVisibleColumns.length}/${columns.length})`}
            </Button>
          </Tooltip>

          <Menu
            anchorEl={columnMenuAnchor}
            open={isColumnMenuOpen}
            onClose={() => setColumnMenuAnchor(null)}
            PaperProps={{
              sx: {
                minWidth: 280,
                maxWidth: 360,
                maxHeight: 440,
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                p: 0.5,
                overflowX: 'hidden',
              },
            }}
          >
            <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8125rem', color: '#0f172a' }}>
                Колонки таблицы
              </Typography>
              <Button
                size="small"
                onClick={handleResetColumns}
                startIcon={<RestartAltIcon sx={{ fontSize: 13 }} />}
                sx={{ fontSize: '0.6875rem', p: 0, minWidth: 'auto', color: '#64748b' }}
              >
                Сброс
              </Button>
            </Box>
            <Divider sx={{ my: 0.5, borderColor: '#f1f5f9' }} />
            <Box sx={{ maxHeight: 290, overflowY: 'auto', overflowX: 'hidden' }}>
              {columns.map((col) => {
                const isChecked = currentVisibleColumns.includes(col.id);
                return (
                  <MenuItem
                    key={col.id}
                    onClick={() => handleToggleColumn(col.id)}
                    sx={{
                      py: 0.6,
                      px: 1.25,
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      whiteSpace: 'normal',
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={isChecked}
                      sx={{ p: 0.5, mr: 1, flexShrink: 0 }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.8125rem',
                        fontWeight: isChecked ? 600 : 400,
                        color: isChecked ? '#0f172a' : '#64748b',
                        lineHeight: 1.3,
                      }}
                    >
                      {col.label}
                    </Typography>
                  </MenuItem>
                );
              })}
            </Box>
            <Divider sx={{ my: 0.5, borderColor: '#f1f5f9' }} />
            <Box sx={{ px: 1, pt: 0.5, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                size="small"
                onClick={handleSelectAllColumns}
                sx={{ fontSize: '0.6875rem', fontWeight: 600, color: '#0284c7' }}
              >
                Показать все
              </Button>
              <Button
                size="small"
                onClick={() => setColumnMenuAnchor(null)}
                variant="contained"
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  py: 0.35,
                  px: 1.75,
                  backgroundColor: '#0284c7',
                }}
              >
                Готово
              </Button>
            </Box>
          </Menu>
        </>
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
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 0. Integrated Navigation Tabs Header */}
      {tabs && (
        <Box
          sx={{
            px: { xs: 1, sm: 1.5 },
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          {tabs}
        </Box>
      )}

      {/* 1. Header Row (if explicit title provided) */}
      {hasHeader && (
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="#0f172a" sx={{ letterSpacing: '-0.01em' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem', display: 'block', mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>

          {utilityTools}
        </Box>
      )}

      {/* 2. Integrated Filter & Action Toolbar (Single Flat Unified Bar) */}
      {toolbar && (
        <Box
          sx={{
            p: { xs: 1.25, sm: 1.5 },
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {toolbar}
          </Box>
          {!hasHeader && utilityTools}
        </Box>
      )}

      {/* If no toolbar but utilityTools exist and no header */}
      {!hasHeader && !toolbar && (showDensityToggle || onRefresh || columns || headerActions) && (
        <Box
          sx={{
            p: 1.25,
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {utilityTools}
        </Box>
      )}

      {/* Contextual Selection Banner */}
      {selectedCount > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ecfdf5',
            borderBottom: '1px solid #a7f3d0',
            px: 2,
            py: 0.75,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`Выбрано: ${selectedCount}`}
              size="small"
              sx={{ fontWeight: 700, height: 22, backgroundColor: '#15803d', color: '#ffffff' }}
            />
            <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#15803d', fontWeight: 500 }}>
              {total ? `из ${total} записей` : ''}
            </Typography>
          </Box>

          {onClearSelection && (
            <Button
              size="small"
              variant="text"
              color="inherit"
              startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
              onClick={onClearSelection}
              sx={{ fontSize: '0.75rem', fontWeight: 600, py: 0.2, color: '#15803d' }}
            >
              Снять выделение
            </Button>
          )}
        </Box>
      )}

      {/* 2. Loading Indicator */}
      {loading && (
        <LinearProgress
          sx={{
            height: 2,
            backgroundColor: '#e2e8f0',
            '& .MuiLinearProgress-bar': { backgroundColor: '#0284c7' },
          }}
        />
      )}

      {/* 3. Table / Grid Content / Empty State */}
      {empty && emptyState ? (
        <Box sx={{ p: { xs: 2, sm: 4 }, display: 'flex', justifyContent: 'center' }}>
          {emptyState}
        </Box>
      ) : viewMode === 'grid' && gridContent ? (
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, flexGrow: 1, backgroundColor: '#f8fafc' }}>
          {gridContent}
        </Box>
      ) : (
        <TableContainer
          sx={{
            maxHeight: maxHeight || (stickyHeader ? 600 : 'none'),
            '&::-webkit-scrollbar': { height: 6, width: 6 },
            '&::-webkit-scrollbar-track': { backgroundColor: '#f8fafc' },
            '&::-webkit-scrollbar-thumb': { backgroundColor: '#cbd5e1', borderRadius: 3 },
            ...densityStyles,
          }}
        >
          {children}
        </TableContainer>
      )}

      {/* 4. Footer & Pagination Area */}
      {(showPagination || footerActions) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
            px: 1.5,
            py: 0.5,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {footerActions}
          </Box>

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
                  color: '#64748b',
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
