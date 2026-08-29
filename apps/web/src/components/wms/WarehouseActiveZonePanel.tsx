import React from 'react';
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { SearchInput } from '@/components/ui';
import type { StorageCell, StorageZone } from './WarehouseTopologyModal';

export interface WarehouseActiveZonePanelProps {
  activeZone: StorageZone;
  filteredCells: StorageCell[];
  searchQuery: string;
  canManageZones: boolean;
  onSearchChange: (value: string) => void;
  onOpenBatchGenerator: () => void;
  onOpenCreateCell: () => void;
  onDeleteZone: (zone: StorageZone) => void;
  onDeleteCell: (cell: StorageCell) => void;
}

export function WarehouseActiveZonePanel({
  activeZone,
  filteredCells,
  searchQuery,
  canManageZones,
  onSearchChange,
  onOpenBatchGenerator,
  onOpenCreateCell,
  onDeleteZone,
  onDeleteCell,
}: WarehouseActiveZonePanelProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        flexGrow: 1,
        p: 2.5,
        borderRadius: '12px',
        border: '1px solid divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          mb: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {activeZone.name}
            </Typography>
            <Chip
              label={`Код: ${activeZone.code}`}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 700, borderRadius: '4px' }}
            />
            {activeZone.description && (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                • {activeZone.description}
              </Typography>
            )}
          </Box>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Всего {activeZone.cells.length} ячеек адресного хранения в этой зоне
          </Typography>
        </Box>

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
                onClick={onOpenBatchGenerator}
                sx={{
                  height: 36,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  borderColor: 'secondary.light',
                  color: 'secondary.dark',
                  bgcolor: 'secondary.light',
                  '&:hover': { bgcolor: 'secondary.light', borderColor: 'secondary.light' },
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
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                Добавить ячейку
              </Button>

              <IconButton
                size="small"
                color="error"
                onClick={() => onDeleteZone(activeZone)}
                aria-label="Удалить зону"
                sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.light' } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </Stack>
      </Box>

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
              onClick={onOpenBatchGenerator}
              sx={{ mt: 2, borderRadius: '8px', textTransform: 'none' }}
            >
              Сгенерировать сетку ячеек (Ряд-Стеллаж-Полка)
            </Button>
          )}
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.5 }}>
          <Grid container spacing={1.5}>
            {filteredCells.map((cell) => {
              const stockCount = cell._count?.stockItems || 0;
              const isOccupied = stockCount > 0;

              return (
                <Grid item xs={6} sm={4} md={3} lg={2.4} key={cell.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: isOccupied ? 'primary.light' : 'divider',
                      bgcolor: isOccupied ? 'rgba(239, 246, 255, 0.6)' : 'background.paper',
                      transition: 'all 0.18s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 88,
                      position: 'relative',
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

                      {canManageZones && (
                        <IconButton
                          className="cell-del-btn"
                          size="small"
                          onClick={() => onDeleteCell(cell)}
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

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                      <Chip
                        label={isOccupied ? `${stockCount} поз. ТМЦ` : 'Свободна'}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          borderRadius: '4px',
                          bgcolor: isOccupied ? 'info.light' : 'action.hover',
                          color: isOccupied ? 'info.dark' : 'text.secondary',
                        }}
                      />

                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: isOccupied ? 'info.main' : 'success.main',
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
    </Paper>
  );
}

export default WarehouseActiveZonePanel;
