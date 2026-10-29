'use client';

import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  IconButton,
  Grid,
  Paper,
  Tooltip,
  Chip,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { SearchInput } from '@/components/ui';
import { StorageCell, StorageZone } from '../WarehouseTopologyModal';

interface TopologyCellGridProps {
  activeZone: StorageZone | null;
  filteredCells: StorageCell[];
  searchQuery: string;
  canManageZones: boolean;
  onSearchChange: (val: string) => void;
  onOpenBatch: () => void;
  onOpenCreateCell: () => void;
  onDeleteZone: (zone: StorageZone) => void;
  onOpenCellDetail: (cell: StorageCell) => void;
  onDeleteCell: (cell: StorageCell) => void;
}

export function TopologyCellGrid({
  activeZone,
  filteredCells,
  searchQuery,
  canManageZones,
  onSearchChange,
  onOpenBatch,
  onOpenCreateCell,
  onDeleteZone,
  onOpenCellDetail,
  onDeleteCell,
}: TopologyCellGridProps) {
  if (!activeZone) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Zone Header Bar */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          bgcolor: 'background.paper',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              {activeZone.name}
            </Typography>
            <Chip
              label={activeZone.code}
              size="small"
              sx={{ fontWeight: 700, borderRadius: '4px', height: 22, bgcolor: 'action.hover' }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Всего {activeZone.cells.length} ячеек адресного хранения в этой зоне
          </Typography>
        </Box>

        {/* Search & Action Buttons */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 190 }}>
            <SearchInput
              size="small"
              placeholder="Поиск ячейки..."
              value={searchQuery}
              onSearch={onSearchChange}
            />
          </Box>

          {canManageZones && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AutoAwesomeIcon sx={{ color: 'secondary.main' }} />}
                onClick={onOpenBatch}
                sx={{
                  height: 36,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  borderColor: 'divider',
                  color: 'secondary.main',
                  bgcolor: 'action.hover',
                  '&:hover': { bgcolor: 'action.selected', borderColor: 'secondary.main' },
                }}
              >
                Мастер генерации ячеек
              </Button>

              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={onOpenCreateCell}
                sx={{
                  height: 36,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                }}
              >
                Добавить ячейку
              </Button>

              <IconButton
                size="small"
                color="error"
                onClick={() => onDeleteZone(activeZone)}
                aria-label="Удалить зону"
                sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Stack>
      </Box>

      {/* 2D Interactive Rack / Cell Grid */}
      {filteredCells.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {searchQuery ? 'Ячейки по запросу не найдены' : 'В этой зоне пока нет созданных ячеек.'}
          </Typography>
          {!searchQuery && canManageZones && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AutoAwesomeIcon />}
              onClick={onOpenBatch}
              sx={{ mt: 2, borderRadius: '8px', textTransform: 'none' }}
            >
              Сгенерировать сетку ячеек (Ряд-Стеллаж-Полка)
            </Button>
          )}
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          <Grid container spacing={1.5}>
            {filteredCells.map((cell) => {
              const stockCount = cell._count?.stockItems || 0;
              const isHighOccupied = stockCount >= 4;
              const isOccupied = stockCount > 0;

              return (
                <Grid item xs={6} sm={4} md={3} lg={2.4} key={cell.id}>
                  <Paper
                    elevation={0}
                    onClick={() => onOpenCellDetail(cell)}
                    sx={{
                      p: 1.5,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: isHighOccupied ? 'warning.main' : isOccupied ? 'primary.light' : 'divider',
                      bgcolor: isOccupied ? 'action.hover' : 'background.paper',
                      transition: 'all 0.18s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 88,
                      position: 'relative',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                        '& .cell-del-btn': { opacity: 1 },
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            color: 'text.primary',
                            fontFeatureSettings: '"tnum"',
                          }}
                        >
                          {cell.code}
                        </Typography>
                        {cell.name && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }} noWrap>
                            {cell.name}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <Tooltip title="Посмотреть содержимое ячейки">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCellDetail(cell);
                            }}
                            sx={{ p: 0.25, color: 'primary.main' }}
                          >
                            <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>

                        {canManageZones && (
                          <IconButton
                            className="cell-del-btn"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCell(cell);
                            }}
                            aria-label={`Удалить ${cell.code}`}
                            sx={{
                              opacity: 0,
                              p: 0.25,
                              color: 'error.main',
                              transition: 'opacity 0.15s ease',
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                      <Chip
                        label={isHighOccupied ? `${stockCount} поз. (Заполнена)` : isOccupied ? `${stockCount} поз. ТМЦ` : 'Свободна'}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          borderRadius: '4px',
                          bgcolor: isHighOccupied ? 'rgba(245, 158, 11, 0.12)' : isOccupied ? 'rgba(2, 132, 199, 0.12)' : 'action.hover',
                          color: isHighOccupied ? 'warning.dark' : isOccupied ? 'primary.main' : 'text.secondary',
                        }}
                      />

                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: isHighOccupied ? 'warning.main' : isOccupied ? 'primary.main' : 'success.main',
                        }}
                      />
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
