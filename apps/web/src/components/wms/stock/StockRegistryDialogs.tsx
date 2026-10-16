'use client';

import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Divider,
  TextField,
  MenuItem,
  Button,
} from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { FormDialog } from '@/components/ui';
import CreateNomenclatureDialog from '@/components/wms/CreateNomenclatureDialog';
import {
  StockDetailDrawer,
  PrintBarcodeModal,
  WmsOperationWizardDialog,
  EditNomenclatureDialog,
  BulkLocationModal,
  PrintableLabelItem,
  OperationType,
} from '@/components/wms';
import { StockRow, ZoneOption, CategoryOption } from './types';

interface StockRegistryDialogsProps {
  // Location
  isLocationModalOpen: boolean;
  locStockItem: StockRow | null;
  warehouseZonesForLoc: ZoneOption[];
  selectedCellId: string;
  isSavingLoc: boolean;
  canEditLocation: boolean;
  onCloseLocationModal: () => void;
  onSaveLocation: () => void;
  onCellIdChange: (val: string) => void;
  onNavigateToWarehouses: () => void;

  // Nomenclature Create & Edit
  isNomenclatureModalOpen: boolean;
  categories: CategoryOption[];
  onCloseNomenclatureModal: () => void;
  onNomenclatureCreated: () => void;

  isEditDialogOpen: boolean;
  editItem: any;
  onCloseEditDialog: () => void;
  onEditSaved: () => void;

  // Bulk Location
  isBulkLocationOpen: boolean;
  selectedIds: string[];
  items: StockRow[];
  onCloseBulkLocation: () => void;
  onBulkLocationSaved: () => void;

  // Print Barcode
  isPrintModalOpen: boolean;
  printItems: PrintableLabelItem[];
  onClosePrintModal: () => void;

  // Operation Wizard
  isWizardOpen: boolean;
  wizardType: OperationType;
  onCloseWizard: () => void;
  onWizardSuccess: () => void;

  // Drawer
  isDrawerOpen: boolean;
  selectedDrawerItem: StockRow | null;
  onCloseDrawer: () => void;
  onOpenEditFromDrawer: (item: any) => void;
}

export function StockRegistryDialogs({
  isLocationModalOpen,
  locStockItem,
  warehouseZonesForLoc,
  selectedCellId,
  isSavingLoc,
  canEditLocation,
  onCloseLocationModal,
  onSaveLocation,
  onCellIdChange,
  onNavigateToWarehouses,

  isNomenclatureModalOpen,
  categories,
  onCloseNomenclatureModal,
  onNomenclatureCreated,

  isEditDialogOpen,
  editItem,
  onCloseEditDialog,
  onEditSaved,

  isBulkLocationOpen,
  selectedIds,
  items,
  onCloseBulkLocation,
  onBulkLocationSaved,

  isPrintModalOpen,
  printItems,
  onClosePrintModal,

  isWizardOpen,
  wizardType,
  onCloseWizard,
  onWizardSuccess,

  isDrawerOpen,
  selectedDrawerItem,
  onCloseDrawer,
  onOpenEditFromDrawer,
}: StockRegistryDialogsProps) {
  return (
    <>
      {/* 1. Диалог назначения ячейки */}
      <FormDialog
        open={isLocationModalOpen}
        onClose={onCloseLocationModal}
        title="Место хранения ТМЦ"
        subtitle={locStockItem ? `${locStockItem.name} (${locStockItem.warehouseName})` : undefined}
        icon={<PlaceOutlinedIcon color="primary" />}
        maxWidth="xs"
        loading={isSavingLoc}
        submitLabel={isSavingLoc ? 'Сохранение...' : 'Сохранить'}
        onSubmit={onSaveLocation}
        submitDisabled={isSavingLoc || !canEditLocation || warehouseZonesForLoc.length === 0}
      >
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Номенклатура:</Typography>
            <Typography variant="subtitle2" fontWeight={700}>
              {locStockItem?.name} ({locStockItem?.article || 'б/а'})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Склад: {locStockItem?.warehouseName} ({locStockItem?.warehouseCode})
            </Typography>
          </Box>
          <Divider />

          {!canEditLocation && (
            <Box sx={{ p: 1.5, bgcolor: 'error.light', border: '1px solid', borderColor: 'error.main', borderRadius: 1.5 }}>
              <Typography variant="body2" color="error.main" fontWeight={600} sx={{ fontSize: '0.8125rem' }}>
                Изменение ячеек недоступно: требуется право конфигурации или назначение МОЛ склада.
              </Typography>
            </Box>
          )}

          {warehouseZonesForLoc.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                На складе <b>{locStockItem?.warehouseName}</b> еще не созданы зоны и ячейки.
              </Typography>
              {canEditLocation && (
                <Button size="small" variant="outlined" onClick={onNavigateToWarehouses} sx={{ mt: 1.5 }}>
                  Настроить зоны
                </Button>
              )}
            </Box>
          ) : (
            <TextField
              select
              fullWidth
              size="small"
              label="Выберите ячейку хранения"
              value={selectedCellId}
              disabled={!canEditLocation}
              onChange={(e) => onCellIdChange(e.target.value)}
              helperText="Закрепляет основную ячейку размещения на складе"
            >
              <MenuItem value="">
                <em>— Без адреса (очистить ячейку) —</em>
              </MenuItem>
              {warehouseZonesForLoc.map((zone) => [
                <MenuItem key={`header-${zone.id}`} disabled sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>
                  {zone.name} ({zone.code})
                </MenuItem>,
                ...zone.cells.map((cell) => (
                  <MenuItem key={cell.id} value={cell.id} sx={{ pl: 4 }}>
                    {cell.code} {cell.name ? `— ${cell.name}` : ''}
                  </MenuItem>
                )),
              ])}
            </TextField>
          )}
        </Stack>
      </FormDialog>

      {/* 2. Создание номенклатуры */}
      <CreateNomenclatureDialog
        open={isNomenclatureModalOpen}
        onClose={onCloseNomenclatureModal}
        onCreated={onNomenclatureCreated}
        categories={categories}
      />

      {/* 3. Массовое размещение */}
      <BulkLocationModal
        open={isBulkLocationOpen}
        onClose={onCloseBulkLocation}
        onSuccess={onBulkLocationSaved}
        selectedItems={items
          .filter((i) => selectedIds.includes(i.id))
          .map((r) => ({
            id: r.id,
            warehouseId: r.warehouseId,
            warehouseName: r.warehouseName,
            warehouseCode: r.warehouseCode,
            name: r.name,
            article: r.article,
            unit: r.unit,
            quantity: r.quantity,
            cellCode: r.cellCode,
          }))}
      />

      {/* 4. Редактирование номенклатуры */}
      {isEditDialogOpen && editItem && (
        <EditNomenclatureDialog
          open={isEditDialogOpen}
          onClose={onCloseEditDialog}
          onSaved={onEditSaved}
          item={editItem}
        />
      )}

      {/* 5. Печать штрихкодов */}
      <PrintBarcodeModal
        open={isPrintModalOpen}
        onClose={onClosePrintModal}
        items={printItems}
      />

      {/* 6. Мастер операций */}
      <WmsOperationWizardDialog
        open={isWizardOpen}
        onClose={onCloseWizard}
        initialType={wizardType}
        onSuccess={onWizardSuccess}
      />

      {/* 7. Боковая панель деталей */}
      <StockDetailDrawer
        open={isDrawerOpen}
        onClose={onCloseDrawer}
        stockItem={selectedDrawerItem}
        onEdit={(item) => onOpenEditFromDrawer(item)}
      />
    </>
  );
}
