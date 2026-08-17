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
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import CloseIcon from '@mui/icons-material/Close';

export type TableDensity = 'compact' | 'standard' | 'comfortable';

export interface DataTableWrapperProps {
  children?: React.ReactNode;
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

export function DataTableWrapper({
  children,
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
        fontSize: '0.7rem',
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
        fontSize: '0.75rem',
      },
    },
    comfortable: {
      '& .MuiTableCell-root': {
        py: 1.75,
        px: 2,
        fontSize: '0.875rem',
      },
      '& .MuiTableCell-head': {
        py: 1.5,
        px: 2,
        fontSize: '0.75rem',
      },
    },
  }[currentDensity];

  const hasHeaderOrToolbar = Boolean(title || subtitle || toolbar || headerActions || onRefresh || showDensityToggle || onViewModeChange);

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
      {/* 1. Header & Toolbar Area */}
      {hasHeaderOrToolbar && (
        <Box
          sx={{
            p: { xs: 1.5, sm: 1.75 },
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          {/* Top Title / Action Row (if present) */}
          {(title || headerActions || onRefresh || showDensityToggle) && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              {title && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    {title}
                  </Typography>
                  {subtitle && (
                    <Typography variant="caption" color="text.secondary">
                      {subtitle}
                    </Typography>
                  )}
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                {/* Density Toggle */}
                {showDensityToggle && viewMode === 'table' && (
                  <ToggleButtonGroup
                    size="small"
                    value={currentDensity}
                    exclusive
                    onChange={(_, val) => val && handleDensityChange(val)}
                    aria-label="плотность таблицы"
                    sx={{ height: 32 }}
                  >
                    <ToggleButton value="compact" aria-label="компактный">
                      <Tooltip title="Компактный вид">
                        <ViewHeadlineIcon fontSize="small" sx={{ fontSize: 16 }} />
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="standard" aria-label="стандартный">
                      <Tooltip title="Стандартный вид">
                        <ViewStreamIcon fontSize="small" sx={{ fontSize: 16 }} />
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="comfortable" aria-label="просторный">
                      <Tooltip title="Просторный вид">
                        <ViewAgendaIcon fontSize="small" sx={{ fontSize: 16 }} />
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                )}

                {/* Refresh Button */}
                {onRefresh && (
                  <Tooltip title="Обновить данные">
                    <span>
                      <IconButton
                        size="small"
                        onClick={onRefresh}
                        disabled={loading || refreshing}
                        sx={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          p: 0.6,
                          color: '#64748b',
                          '&:hover': { color: 'primary.main', backgroundColor: '#f0f9ff' },
                        }}
                      >
                        <RefreshIcon
                          fontSize="small"
                          sx={{
                            animation: refreshing ? 'spin 1s linear infinite' : 'none',
                            '@keyframes spin': {
                              '0%': { transform: 'rotate(0deg)' },
                              '100%': { transform: 'rotate(360deg)' },
                            },
                          }}
                        />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}

                {headerActions}
              </Box>
            </Box>
          )}

          {/* Integrated Filter & Search Toolbar */}
          {toolbar && <Box sx={{ width: '100%' }}>{toolbar}</Box>}

          {/* Contextual Selection Banner */}
          {selectedCount > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                px: 1.5,
                py: 0.75,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`Выбрано: ${selectedCount}`}
                  size="small"
                  color="success"
                  sx={{ fontWeight: 700, height: 22 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
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
                  sx={{ fontSize: '0.75rem', fontWeight: 600, py: 0.2 }}
                >
                  Снять выделение
                </Button>
              )}
            </Box>
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
