'use client';

import React, { useState, Suspense } from 'react';
import {
  Box,
  TextField,
  MenuItem,
} from '@mui/material';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PageHeader from '@/components/layout/PageHeader';
import { useRouter } from 'next/navigation';
import {
  AUDIT_ACTION_MAP,
  PERMISSIONS,
} from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import {
  SearchInput,
  FilterToolbar,
  EmptyState,
  DataTableWrapper,
  PageLoading,
  DatePickerField,
} from '@/components/ui';
import {
  AuditLogItem,
  AUDIT_COLUMNS,
  ENTITY_TYPE_LABELS,
  useAuditRegistry,
  AuditKpiBar,
  AuditRegistryTable,
  AuditDetailsDialog,
} from '@/components/eps';

function AuditHistoryContent() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();

  const canAccessAudit =
    Boolean(user?.roles?.includes('admin')) ||
    hasPermission(PERMISSIONS.ADMIN_AUDIT_VIEW) ||
    hasPermission(PERMISSIONS.EPS_EQUIPMENT_VIEW);

  const {
    items,
    total,
    page,
    pageSize,
    loading,
    search,
    actionFilter,
    entityTypeFilter,
    equipmentFilter,
    dateFrom,
    dateTo,
    equipmentOptions,
    stats,
    setPage,
    setPageSize,
    setSearch,
    setActionFilter,
    setEntityTypeFilter,
    setEquipmentFilter,
    setDateFrom,
    setDateTo,
    handleKpiFilter,
    handleResetFilters,
  } = useAuditRegistry(canAccessAudit);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    AUDIT_COLUMNS.map((c) => c.id)
  );

  // Details Modal
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);

  if (!canAccessAudit) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader
          title="Журнал изменений и аудит оборудования"
          subtitle="Хронология модификаций паспортов, документов, статусов и перемещений"
          breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'История' }]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет прав для просмотра журнала аудита оборудования."
          icon={<HistoryOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  const activeFilterCount =
    (search ? 1 : 0) +
    (actionFilter ? 1 : 0) +
    (entityTypeFilter ? 1 : 0) +
    (equipmentFilter ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0);

  return (
    <Box sx={{ pb: 3, width: '100%' }}>
      {/* 1. Header */}
      <PageHeader
        title="Журнал изменений и аудит оборудования"
        subtitle="Хронология изменений карточек оборудования, параметров паспорта, прикрепления файлов и согласований"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'История изменений' },
        ]}
      />

      {/* 2. Top Overview KPI Cards */}
      <AuditKpiBar
        stats={stats}
        selectedAction={actionFilter}
        loading={loading}
        onKpiFilter={handleKpiFilter}
      />

      {/* 3. Table with Toolbar */}
      <DataTableWrapper
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(_, newPage) => setPage(newPage)}
        onPageSizeChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        columns={AUDIT_COLUMNS}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        loading={loading}
        stickyHeader
        toolbar={
          <FilterToolbar
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
            actions={
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    minWidth: 150,
                    bgcolor: 'background.paper',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все действия</MenuItem>
                  {Object.entries(AUDIT_ACTION_MAP).map(([key, info]) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                      {info.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  value={entityTypeFilter}
                  onChange={(e) => {
                    setEntityTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    minWidth: 170,
                    bgcolor: 'background.paper',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все объекты</MenuItem>
                  {Object.entries(ENTITY_TYPE_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  value={equipmentFilter}
                  onChange={(e) => {
                    setEquipmentFilter(e.target.value);
                    setPage(1);
                  }}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    minWidth: 180,
                    maxWidth: 240,
                    bgcolor: 'background.paper',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все оборудование</MenuItem>
                  {equipmentOptions.map((eq) => (
                    <MenuItem key={eq.id} value={eq.id} sx={{ fontSize: '0.8125rem' }}>
                      {eq.name} ({eq.inventoryNumber || 'Б/Н'})
                    </MenuItem>
                  ))}
                </TextField>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DatePickerField
                    label="Дата с"
                    size="small"
                    value={dateFrom}
                    onChange={(val) => {
                      setDateFrom(val || '');
                      setPage(1);
                    }}
                    sx={{ width: 130 }}
                  />
                  <DatePickerField
                    label="Дата по"
                    size="small"
                    value={dateTo}
                    onChange={(val) => {
                      setDateTo(val || '');
                      setPage(1);
                    }}
                    sx={{ width: 130 }}
                  />
                </Box>
              </Box>
            }
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 260 }, flexGrow: 1 }}>
              <SearchInput
                value={search}
                placeholder="Поиск по деталям изменений, логину..."
                onSearch={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
              />
            </Box>
          </FilterToolbar>
        }
      >
        <AuditRegistryTable
          items={items}
          visibleColumns={visibleColumns}
          loading={loading}
          onOpenDetailsModal={(item) => setSelectedAuditLog(item)}
          onNavigateToEquipment={(eqId) => router.push(`/eps/${eqId}`)}
          onResetFilters={handleResetFilters}
          hasFilters={activeFilterCount > 0}
        />
      </DataTableWrapper>

      {/* Details Dialog */}
      <AuditDetailsDialog
        open={Boolean(selectedAuditLog)}
        item={selectedAuditLog}
        onClose={() => setSelectedAuditLog(null)}
      />
    </Box>
  );
}

export default function EquipmentHistoryPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка журнала аудита..." />}>
      <AuditHistoryContent />
    </Suspense>
  );
}
