'use client';

import React, { Suspense } from 'react';
import {
  Box,
  TextField,
  MenuItem,
} from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';
import PageHeader from '@/components/layout/PageHeader';
import { EQUIPMENT_STATUS_MAP, PERMISSIONS } from '@ems/shared';
import { useAuth } from '@/lib/auth-client';
import {
  EmptyState,
  DataTableWrapper,
  SearchInput,
  ExportButton,
  DatePickerField,
  ConfirmDialog,
  FilterToolbar,
  PageLoading,
} from '@/components/ui';
import {
  useReportBuilder,
  ReportPresetBar,
  ReportPreviewTable,
  ReportColumnDialog,
  ReportSaveTemplateDialog,
} from '@/components/eps';

function ReportBuilderContent() {
  const { user, hasPermission } = useAuth();

  const canAccessReports =
    Boolean(user?.roles?.includes('admin')) ||
    hasPermission(PERMISSIONS.EPS_REPORTS_VIEW) ||
    hasPermission(PERMISSIONS.EPS_REPORTS_MANAGE);
  const canManageTemplates = Boolean(
    user?.roles?.includes('admin') || hasPermission(PERMISSIONS.EPS_REPORTS_MANAGE)
  );

  const {
    availableColumns,
    selectedColumnKeys,
    columnBuilderOpen,
    searchQueryColumn,
    rows,
    paginatedRows,
    activeColumnsDef,
    loadingData,
    sortField,
    sortOrder,
    statusFilter,
    searchQuery,
    manufacturerFilter,
    locationFilter,
    dateFrom,
    dateTo,
    page,
    pageSize,
    templates,
    activePresetOrTemplateId,
    saveModalOpen,
    newTemplateName,
    newTemplateDesc,
    newTemplatePublic,
    savingTemplate,
    deleteTemplateId,
    setSelectedColumnKeys,
    setColumnBuilderOpen,
    setSearchQueryColumn,
    setSortField,
    setSortOrder,
    setStatusFilter,
    setSearchQuery,
    setManufacturerFilter,
    setLocationFilter,
    setDateFrom,
    setDateTo,
    setPage,
    setPageSize,
    setSaveModalOpen,
    setNewTemplateName,
    setNewTemplateDesc,
    setNewTemplatePublic,
    setDeleteTemplateId,
    handleApplyPreset,
    handleApplyTemplate,
    handleSaveTemplate,
    confirmDeleteTemplate,
    handleExportExcel,
    handleExportCsv,
    handleExportJson,
  } = useReportBuilder();

  if (!canAccessReports) {
    return (
      <Box sx={{ pb: 4 }}>
        <PageHeader
          title="Генератор ведомостей и отчетов (EPS)"
          subtitle="Формирование регламентных описей, технических отчетов и выгрузок в Excel"
          breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Отчеты' }]}
        />
        <EmptyState
          title="Доступ ограничен"
          description="У вашей учетной записи нет прав для построения отчетов оборудования."
          icon={<TableChartIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    );
  }

  const activeFilterCount =
    (statusFilter ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (manufacturerFilter ? 1 : 0) +
    (locationFilter ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0);

  return (
    <Box sx={{ pb: 4, width: '100%' }}>
      {/* 1. Header */}
      <PageHeader
        title="Генератор ведомостей и отчетов (EPS)"
        subtitle="Формирование регламентных описей, инвентарных ведомостей и аналитических выборок оборудования"
        breadcrumbs={[
          { label: 'Главная', href: '/' },
          { label: 'Оборудование', href: '/eps' },
          { label: 'Генератор отчетов' },
        ]}
        actions={
          <ExportButton
            onExport={(format) => {
              if (format === 'xlsx') handleExportExcel();
              else if (format === 'csv') handleExportCsv();
              else if (format === 'json') handleExportJson();
            }}
            formats={['xlsx', 'csv', 'json']}
            disabled={rows.length === 0}
          />
        }
      />

      {/* 2. Industry Presets and Saved Templates */}
      <ReportPresetBar
        activePresetOrTemplateId={activePresetOrTemplateId}
        selectedColumnCount={selectedColumnKeys.length}
        templates={templates}
        canManageTemplates={canManageTemplates}
        onApplyPreset={handleApplyPreset}
        onApplyTemplate={handleApplyTemplate}
        onOpenColumnBuilder={() => setColumnBuilderOpen(true)}
        onOpenSaveModal={() => setSaveModalOpen(true)}
        onDeleteTemplate={(id) => setDeleteTemplateId(id)}
      />

      {/* 3. Filter Toolbar & Table Preview */}
      <DataTableWrapper
        total={rows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={(_, newPage) => setPage(newPage)}
        onPageSizeChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(1);
        }}
        columns={activeColumnsDef.map((c) => ({ id: c.key, label: c.name }))}
        visibleColumns={activeColumnsDef.map((c) => c.key)}
        onVisibleColumnsChange={(keys) => setSelectedColumnKeys(keys)}
        loading={loadingData}
        stickyHeader
        toolbar={
          <FilterToolbar
            variant="embedded"
            activeFilterCount={activeFilterCount}
            onResetFilters={() => {
              setStatusFilter('');
              setSearchQuery('');
              setManufacturerFilter('');
              setLocationFilter('');
              setDateFrom('');
              setDateTo('');
            }}
            actions={
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                  sx={{
                    minWidth: 150,
                    bgcolor: 'background.paper',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.8125rem' }}>Все статусы</MenuItem>
                  {Object.entries(EQUIPMENT_STATUS_MAP).map(([key, info]) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: '0.8125rem' }}>
                      {info.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  size="small"
                  placeholder="Производитель..."
                  value={manufacturerFilter}
                  onChange={(e) => setManufacturerFilter(e.target.value)}
                  sx={{
                    width: 150,
                    bgcolor: 'background.paper',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
                  }}
                />

                <TextField
                  size="small"
                  placeholder="Локация..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  sx={{
                    width: 140,
                    bgcolor: 'background.paper',
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8125rem', height: 36 },
                  }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DatePickerField
                    label="Ввод с"
                    size="small"
                    value={dateFrom}
                    onChange={(val) => setDateFrom(val || '')}
                    sx={{ width: 130 }}
                  />
                  <DatePickerField
                    label="Ввод по"
                    size="small"
                    value={dateTo}
                    onChange={(val) => setDateTo(val || '')}
                    sx={{ width: 130 }}
                  />
                </Box>
              </Box>
            }
          >
            <Box sx={{ minWidth: { xs: '100%', sm: 260 }, flexGrow: 1 }}>
              <SearchInput
                value={searchQuery}
                placeholder="Поиск по наименованию, инв. номеру..."
                onSearch={(val) => setSearchQuery(val)}
              />
            </Box>
          </FilterToolbar>
        }
      >
        <ReportPreviewTable
          columns={activeColumnsDef}
          rows={paginatedRows}
          sortField={sortField}
          sortOrder={sortOrder}
          loading={loadingData}
          onRequestSort={(field) => {
            const isAsc = sortField === field && sortOrder === 'asc';
            setSortOrder(isAsc ? 'desc' : 'asc');
            setSortField(field);
          }}
          onResetFilters={() => {
            setStatusFilter('');
            setSearchQuery('');
            setManufacturerFilter('');
            setLocationFilter('');
            setDateFrom('');
            setDateTo('');
          }}
          hasFilters={activeFilterCount > 0}
        />
      </DataTableWrapper>

      {/* 4. Column Selection Dialog */}
      <ReportColumnDialog
        open={columnBuilderOpen}
        availableColumns={availableColumns}
        selectedKeys={selectedColumnKeys}
        searchQuery={searchQueryColumn}
        onClose={() => setColumnBuilderOpen(false)}
        onSearchChange={setSearchQueryColumn}
        onToggleColumn={(key) => {
          setSelectedColumnKeys((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
          );
        }}
        onSelectAll={() => setSelectedColumnKeys(availableColumns.map((c) => c.key))}
        onDeselectAll={() => setSelectedColumnKeys([])}
      />

      {/* 5. Save Template Dialog */}
      <ReportSaveTemplateDialog
        open={saveModalOpen}
        name={newTemplateName}
        description={newTemplateDesc}
        isPublic={newTemplatePublic}
        saving={savingTemplate}
        onClose={() => setSaveModalOpen(false)}
        onNameChange={setNewTemplateName}
        onDescriptionChange={setNewTemplateDesc}
        onIsPublicChange={setNewTemplatePublic}
        onSubmit={handleSaveTemplate}
      />

      {/* 6. Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTemplateId)}
        title="Удаление шаблона отчета"
        message="Вы уверены, что хотите удалить сохраненный шаблон ведомости?"
        variant="danger"
        onConfirm={confirmDeleteTemplate}
        onClose={() => setDeleteTemplateId(null)}
      />
    </Box>
  );
}

export default function ReportBuilderPage() {
  return (
    <Suspense fallback={<PageLoading text="Загрузка генератора отчетов..." />}>
      <ReportBuilderContent />
    </Suspense>
  );
}
