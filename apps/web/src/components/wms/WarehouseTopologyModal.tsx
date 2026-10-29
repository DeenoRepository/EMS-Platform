'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import { EmptyState } from '@/components/ui';
import { PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import { CreateZoneDialog } from './topology/CreateZoneDialog';
import { CreateCellDialog } from './topology/CreateCellDialog';
import { BatchCellGeneratorDialog } from './topology/BatchCellGeneratorDialog';
import { CellDetailDialog } from './topology/CellDetailDialog';
import { TopologyCellGrid } from './topology/TopologyCellGrid';
import { ZonesNavigationBar } from './topology/ZonesNavigationBar';
import { WarehouseTopologyHeader } from './topology/WarehouseTopologyHeader';
import { StorageCell, StorageZone } from './topology/types';
import { useZoneTopology } from './topology/useZoneTopology';
import { useCellTopology } from './topology/useCellTopology';

const FONT_MEDIUM = 500;
const FONT_SEMI_BOLD = 600;

export type { StorageCell, StorageZone };

interface WarehouseTopologyModalProps {
  open: boolean;
  onClose: () => void;
  warehouse: { id: string; name: string; code: string; responsibleUserId?: string | null } | null;
  onRefreshParent?: () => void;
}

export default function WarehouseTopologyModal({
  open,
  onClose,
  warehouse,
  onRefreshParent,
}: WarehouseTopologyModalProps) {
  const { hasPermission, user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const canManageZones =
    hasPermission(PERMISSIONS.WMS_ZONES_MANAGE) ||
    hasPermission(PERMISSIONS.WMS_WAREHOUSES_MANAGE) ||
    Boolean(user?.roles?.includes('admin')) ||
    Boolean(user?.userId && warehouse?.responsibleUserId === user.userId);

  const zoneTopology = useZoneTopology({ warehouse, open, onRefreshParent });
  const cellTopology = useCellTopology({
    activeZone: zoneTopology.activeZone,
    fetchZones: zoneTopology.fetchZones,
    onRefreshParent,
  });

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : '16px',
            border: isMobile ? 'none' : '1px solid',
            borderColor: 'divider',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            maxHeight: isMobile ? '100vh' : 'calc(100vh - 96px)',
            m: isMobile ? 0 : { xs: 2, sm: 3, md: 4 },
          },
        }}
      >
        <WarehouseTopologyHeader
          warehouse={warehouse}
          totalCells={zoneTopology.totalCellsInWarehouse}
          totalOccupiedCells={zoneTopology.totalOccupiedCells}
          onClose={onClose}
        />

        <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'background.default', overflowY: 'auto' }}>
          {zoneTopology.isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={36} sx={{ color: 'primary.main', mb: 2 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: FONT_MEDIUM }}>
                Загрузка топологии и ячеек...
              </Typography>
            </Box>
          ) : zoneTopology.zones.length === 0 ? (
            <Box sx={{ bgcolor: 'background.paper', p: 4, borderRadius: '12px', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState
                icon={<GridViewIcon sx={{ fontSize: 44, color: 'text.secondary' }} />}
                title="Зоны хранения не созданы"
                description="Разделите склад на зоны (Стеллажи, Напольное хранение, Буферная зона) и добавьте ячейки для точного учета местоположения ТМЦ."
                actionText={canManageZones ? 'Создать первую зону' : undefined}
                onAction={() => zoneTopology.setIsCreateZoneOpen(true)}
              />
            </Box>
          ) : (
            <>
              <ZonesNavigationBar
                zones={zoneTopology.zones}
                selectedIndex={zoneTopology.selectedZoneIndex}
                canManageZones={canManageZones}
                onSelectIndex={(val) => {
                  zoneTopology.setSelectedZoneIndex(val);
                  cellTopology.setSearchQuery('');
                }}
                onOpenCreateZone={() => zoneTopology.setIsCreateZoneOpen(true)}
              />

              {zoneTopology.activeZone && (
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    overflow: 'hidden',
                  }}
                >
                  <TopologyCellGrid
                    activeZone={zoneTopology.activeZone}
                    filteredCells={cellTopology.filteredCells}
                    searchQuery={cellTopology.searchQuery}
                    canManageZones={canManageZones}
                    onSearchChange={cellTopology.setSearchQuery}
                    onOpenBatch={() => {
                      cellTopology.setBatchPrefix(zoneTopology.activeZone?.code || 'A');
                      cellTopology.setIsBatchOpen(true);
                    }}
                    onOpenCreateCell={() => cellTopology.setIsCreateCellOpen(true)}
                    onDeleteZone={zoneTopology.handleDeleteZone}
                    onOpenCellDetail={cellTopology.handleOpenCellDetail}
                    onDeleteCell={cellTopology.handleDeleteCell}
                  />
                </Paper>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '8px', fontWeight: FONT_SEMI_BOLD }}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      <CreateZoneDialog
        open={zoneTopology.isCreateZoneOpen}
        onClose={() => zoneTopology.setIsCreateZoneOpen(false)}
        name={zoneTopology.newZoneName}
        code={zoneTopology.newZoneCode}
        description={zoneTopology.newZoneDesc}
        isLoading={zoneTopology.isSavingZone}
        onNameChange={zoneTopology.setNewZoneName}
        onCodeChange={zoneTopology.setNewZoneCode}
        onDescriptionChange={zoneTopology.setNewZoneDesc}
        onSubmit={zoneTopology.handleCreateZoneSubmit}
      />

      <CreateCellDialog
        open={cellTopology.isCreateCellOpen}
        onClose={() => cellTopology.setIsCreateCellOpen(false)}
        zoneName={zoneTopology.activeZone?.name}
        zoneCode={zoneTopology.activeZone?.code}
        cellCode={cellTopology.newCellCode}
        cellName={cellTopology.newCellName}
        isLoading={cellTopology.isSavingCell}
        onCellCodeChange={cellTopology.setNewCellCode}
        onCellNameChange={cellTopology.setNewCellName}
        onSubmit={cellTopology.handleCreateCellSubmit}
      />

      <BatchCellGeneratorDialog
        open={cellTopology.isBatchOpen}
        onClose={() => cellTopology.setIsBatchOpen(false)}
        prefix={cellTopology.batchPrefix}
        racks={cellTopology.batchRacks}
        tiers={cellTopology.batchTiers}
        slots={cellTopology.batchSlots}
        isLoading={cellTopology.isGeneratingBatch}
        onPrefixChange={cellTopology.setBatchPrefix}
        onRacksChange={cellTopology.setBatchRacks}
        onTiersChange={cellTopology.setBatchTiers}
        onSlotsChange={cellTopology.setBatchSlots}
        onSubmit={cellTopology.handleBatchGenerate}
      />

      <CellDetailDialog
        cell={cellTopology.selectedCellForDetail}
        zone={zoneTopology.activeZone}
        warehouse={warehouse}
        cellDetailData={cellTopology.cellDetailData}
        isLoading={cellTopology.isLoadingCellDetail}
        isMobile={isMobile}
        onClose={() => cellTopology.setSelectedCellForDetail(null)}
      />
    </>
  );
}
