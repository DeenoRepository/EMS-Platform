'use client';

import React from 'react';
import { Stack, Alert, Paper, Typography } from '@mui/material';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import {
  TransferWarehouseFields,
  TransferItemPicker,
  TransferItemsTable,
  WarehouseOption,
  NomenclatureOption,
  RequestLineItem,
  FONT_WEIGHT_BOLD,
} from './TransferRequestSubcomponents';

export interface TransferDialogBodyProps {
  targetWh: WarehouseOption | null;
  sourceWarehouseId: string;
  onSourceChange: (id: string) => void;
  warehouses: WarehouseOption[];
  displayName?: string | null;
  requestReason: string;
  onReasonChange: (reason: string) => void;
  nomenclatures: NomenclatureOption[];
  selectedNomenclature: NomenclatureOption | null;
  onNomenclatureChange: (nom: NomenclatureOption | null) => void;
  itemQty: string;
  onQtyChange: (qty: string) => void;
  onAddItem: () => void;
  stockMap: Record<string, number>;
  isLoadingStock: boolean;
  lineItems: RequestLineItem[];
  onRemoveItem: (idx: number) => void;
}

function ItemSelectionSection(props: TransferDialogBodyProps) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '8px', bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: FONT_WEIGHT_BOLD, color: 'text.primary', mb: 1.5 }}>
        Подбор запрашиваемых позиций ТМЦ:
      </Typography>

      <TransferItemPicker
        nomenclatures={props.nomenclatures}
        selectedNomenclature={props.selectedNomenclature}
        onNomenclatureChange={props.onNomenclatureChange}
        itemQty={props.itemQty}
        onQtyChange={props.onQtyChange}
        onAddItem={props.onAddItem}
        stockMap={props.stockMap}
        isLoadingStock={props.isLoadingStock}
      />

      <TransferItemsTable
        items={props.lineItems}
        stockMap={props.stockMap}
        onRemove={props.onRemoveItem}
      />
    </Paper>
  );
}

export function TransferDialogBody(props: TransferDialogBodyProps) {
  return (
    <Stack spacing={2.5}>
      <Alert severity="info" icon={<MoveToInboxIcon />} sx={{ borderRadius: '8px' }}>
        Заявка поступит материально ответственному лицу склада-донора. После его согласования ТМЦ будут отгружены в ваш адрес.
      </Alert>

      <TransferWarehouseFields
        targetWh={props.targetWh}
        sourceWarehouseId={props.sourceWarehouseId}
        onSourceChange={props.onSourceChange}
        warehouses={props.warehouses}
        displayName={props.displayName || undefined}
        requestReason={props.requestReason}
        onReasonChange={props.onReasonChange}
      />

      <ItemSelectionSection {...props} />
    </Stack>
  );
}

