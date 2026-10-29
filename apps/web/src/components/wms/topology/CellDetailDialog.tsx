'use client';

import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Stack,
  Chip,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import CloseIcon from '@mui/icons-material/Close';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { EmptyState } from '@/components/ui';
import { StorageCell, StorageZone } from '../WarehouseTopologyModal';

interface CellDetailDialogProps {
  cell: StorageCell | null;
  zone: StorageZone | null;
  warehouse: { name: string } | null;
  cellDetailData: any | null;
  isLoading: boolean;
  isMobile: boolean;
  onClose: () => void;
}

export function CellDetailDialog({
  cell,
  zone,
  warehouse,
  cellDetailData,
  isLoading,
  isMobile,
  onClose,
}: CellDetailDialogProps) {
  if (!cell) return null;

  return (
    <Dialog
      open={Boolean(cell)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : '14px',
          border: isMobile ? 'none' : '1px solid',
          borderColor: 'divider',
          boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.15)',
          maxHeight: isMobile ? '100vh' : 'calc(100vh - 96px)',
          m: isMobile ? 0 : { xs: 2, sm: 3, md: 4 },
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 2,
          px: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GridViewIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              Содержимое ячейки: {cell.code}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {zone?.name} ({zone?.code}) • Склад: {warehouse?.name}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: 'background.default', flexGrow: 1, overflowY: 'auto' }}>
        {isLoading || !cellDetailData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid item xs={12} sm={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Позиций в ячейке
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ mt: 0.5 }}>
                    {cellDetailData.itemsCount || 0}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Суммарное количество
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ mt: 0.5, fontFeatureSettings: '"tnum"' }}>
                    {cellDetailData.totalQuantity || 0}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Статус заполненности
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    color={cellDetailData.itemsCount > 0 ? 'success.dark' : 'text.disabled'}
                    sx={{ mt: 0.5 }}
                  >
                    {cellDetailData.itemsCount > 0 ? 'Занята' : 'Свободна'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {cellDetailData.items.length === 0 ? (
              <EmptyState
                icon={<Inventory2OutlinedIcon sx={{ fontSize: 40, color: 'text.disabled' }} />}
                title="В ячейке нет остатков ТМЦ"
                description="Ячейка готова для приемки или перемещения номенклатуры"
                minHeight={200}
              />
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'background.paper' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, py: 1.25, width: 120 }}>Артикул</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.25 }}>Номенклатура</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.25 }}>Категория</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, py: 1.25 }}>Остаток</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 1.25 }}>Совместимое оборудование</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cellDetailData.items.map((item: any) => (
                      <TableRow key={item.stockItemId} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', py: 1 }}>
                          <Chip label={item.article || 'Б/А'} size="small" variant="outlined" sx={{ borderRadius: '4px', fontWeight: 600 }} />
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {item.name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', py: 1 }}>
                          {item.category}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1 }}>
                          <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontFeatureSettings: '"tnum"' }}>
                            {item.quantity} {item.unit}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          {item.compatibleEquipment && item.compatibleEquipment.length > 0 ? (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                              {item.compatibleEquipment.slice(0, 2).map((eq: any) => (
                                <Chip
                                  key={eq.id}
                                  icon={<PrecisionManufacturingIcon sx={{ fontSize: '12px !important' }} />}
                                  label={eq.name}
                                  size="small"
                                  sx={{ fontSize: '0.6875rem', height: 20, borderRadius: '4px' }}
                                />
                              ))}
                              {item.compatibleEquipment.length > 2 && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
                                  +{item.compatibleEquipment.length - 2}
                                </Typography>
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '8px', fontWeight: 600 }}>
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
}
