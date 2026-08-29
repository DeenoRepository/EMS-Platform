'use client';

import React from 'react';
import { Box } from '@mui/material';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import {
  DataTableWrapper,
  FilterToolbar,
  NavTabsContainer,
  SearchInput,
  type TabItem,
} from '@/components/ui';
import { WarehouseSelect } from '@/components/wms';
import WmsTransfersTable, { StockTransferRecord } from './WmsTransfersTable';

type TransferTab = 'inbound' | 'requests' | 'outbound' | 'my_requests' | 'all';

interface TransferCounts {
  inbound: number;
  requests: number;
  outbound: number;
  myRequests: number;
  total: number;
}

interface WmsTransfersTablePanelProps {
  transfers: StockTransferRecord[];
  isLoading: boolean;
  transferTab: TransferTab;
  transfersSearch: string;
  transfersPage: number;
  transfersRowsPerPage: number;
  transferTotal: number;
  transferCounts: TransferCounts;
  selectedWarehouse: string;
  availableWarehouses: Parameters<typeof WarehouseSelect>[0]['warehouses'];
  isAdmin: boolean;
  currentUserId?: string;
  isDispatchingId: string | null;
  onTransferTabChange: (tab: TransferTab) => void;
  onSearchChange: (value: string) => void;
  onWarehouseChange: (value: string) => void;
  onResetFilters: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onReceive: (transfer: StockTransferRecord) => void;
  onReject: (transfer: StockTransferRecord) => void;
  onQuickDispatch: (transfer: StockTransferRecord) => void;
}

export default function WmsTransfersTablePanel({
  transfers,
  isLoading,
  transferTab,
  transfersSearch,
  transfersPage,
  transfersRowsPerPage,
  transferTotal,
  transferCounts,
  selectedWarehouse,
  availableWarehouses,
  isAdmin,
  currentUserId,
  isDispatchingId,
  onTransferTabChange,
  onSearchChange,
  onWarehouseChange,
  onResetFilters,
  onPageChange,
  onPageSizeChange,
  onReceive,
  onReject,
  onQuickDispatch,
}: WmsTransfersTablePanelProps) {
  const transferSubTabs: TabItem[] = [
    {
      value: 'inbound',
      label: 'Входящие на приемку',
      icon: <MoveToInboxIcon sx={{ fontSize: 16 }} />,
      badge: transferCounts.inbound || undefined,
      badgeColor: 'error',
    },
    {
      value: 'requests',
      label: 'Запросы на мой склад',
      icon: <HourglassEmptyIcon sx={{ fontSize: 16 }} />,
      badge: transferCounts.requests || undefined,
      badgeColor: 'warning',
    },
    {
      value: 'outbound',
      label: 'Исходящие (В пути)',
      icon: <LocalShippingOutlinedIcon sx={{ fontSize: 16 }} />,
      badge: transferCounts.outbound || undefined,
    },
    {
      value: 'my_requests',
      label: 'Мои заявки',
      icon: <AssignmentOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      value: 'all',
      label: 'Все перемещения',
      icon: <SwapHorizIcon sx={{ fontSize: 16 }} />,
    },
  ];

  return (
    <DataTableWrapper
      tabs={
        <NavTabsContainer
          tabs={transferSubTabs}
          value={transferTab}
          onChange={(value) => {
            if (typeof value === 'string' && transferSubTabs.some((tab) => tab.value === value)) {
              onTransferTabChange(value as TransferTab);
            }
          }}
        />
      }
      toolbar={
        <FilterToolbar
          variant="embedded"
          activeFilterCount={(transfersSearch ? 1 : 0) + (selectedWarehouse ? 1 : 0)}
          onResetFilters={onResetFilters}
        >
          <Box sx={{ minWidth: { xs: '100%', sm: 280 } }}>
            <SearchInput
              placeholder="Поиск по номеру, складу, ТМЦ..."
              value={transfersSearch}
              onSearch={onSearchChange}
            />
          </Box>
          <WarehouseSelect
            value={selectedWarehouse}
            onChange={onWarehouseChange}
            warehouses={availableWarehouses}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
          />
        </FilterToolbar>
      }
      total={transferTotal}
      page={transfersPage}
      pageSize={transfersRowsPerPage}
      onPageChange={(_, newPage) => onPageChange(newPage)}
      onPageSizeChange={(event) => onPageSizeChange(parseInt(event.target.value, 10))}
      loading={isLoading}
    >
      <WmsTransfersTable
        transfers={transfers}
        isLoading={isLoading}
        transferTab={transferTab}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        isDispatchingId={isDispatchingId}
        onReceive={onReceive}
        onReject={onReject}
        onQuickDispatch={onQuickDispatch}
      />
    </DataTableWrapper>
  );
}
